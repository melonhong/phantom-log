export type SaveBackupResult = 'saved' | 'cancelled' | 'downloaded';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

export async function saveBackupFile(
  zipBlob: Blob,
  fileName: string
): Promise<SaveBackupResult> {
  const arrayBuffer = await zipBlob.arrayBuffer();
  if (arrayBuffer.byteLength === 0) return 'downloaded';

  const makeFile = (name: string, type: string) =>
    new File([zipBlob], name, { type });

  const trySaveFilePicker = async (): Promise<boolean> => {
    // 모바일이라도 File System Access API를 지원하면 (예: 최신 Android Chrome) 사용한다.
    // 이걸 막으면 사용자가 고른 폴더에 저장이 안 되고 공유 시트로 강제 우회됨.
    if (!('showSaveFilePicker' in window)) return false;
    try {
      const handle = await (window as Window & {
        showSaveFilePicker: (options: {
          suggestedName: string;
          types: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(arrayBuffer);
      await writable.close();

      const saved = await handle.getFile();
      if (saved.size === 0) {
        console.warn('[showSaveFilePicker] 0KB 파일 저장됨');
        return false;
      }
      return true;
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('[showSaveFilePicker 실패]', err);
      return false;
    }
  };

  const tryShare = async (): Promise<boolean> => {
    if (!navigator.share) return false;

    // 여러 후보를 순차 재시도하면 사용자가 고른 폴더에 매번 다시 쓰기를 시도해
    // "이상한 파일"이 여러 개 쌓이는 원인이 되므로, 한 번만 정상적으로 시도한다.
    const file = makeFile(fileName, 'application/zip');
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }
    try {
      await navigator.share({ files: [file], title: '기록장 백업' });
      return true;
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('[Share API 실패]', err);
      return false;
    }
  };

  const downloadZip = (): void => {
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  try {
    if (isMobile()) {
      // 모바일: 폴더 선택 지원 브라우저는 파일 피커 우선, 아니면 공유 시트, 최후엔 다운로드
      if (await trySaveFilePicker()) return 'saved';
      if (await tryShare()) return 'saved';
      downloadZip();
      return 'downloaded';
    }

    // 데스크탑: 저장 위치 선택 → 공유 → 다운로드
    if (await trySaveFilePicker()) return 'saved';
    if (await tryShare()) return 'saved';
    downloadZip();
    return 'downloaded';
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') return 'cancelled';
    downloadZip();
    return 'downloaded';
  }
}

export function getBackupSaveToast(result: SaveBackupResult): string | null {
  switch (result) {
    case 'saved':
      return 'ZIP 백업 파일로 저장했어요.';
    case 'downloaded':
      if (isIOS()) {
        return '다운로드 폴더에 저장됐어요. 폴더를 고르려면 「파일에 저장」을 선택해주세요.';
      }
      if (isMobile()) {
        return '다운로드 폴더에 저장됐어요. 공유 시트에서 「파일에 저장」 또는 Drive를 선택하면 원하는 위치에 저장할 수 있어요.';
      }
      return '다운로드 폴더에 저장했어요.';
    case 'cancelled':
      return null;
  }
}