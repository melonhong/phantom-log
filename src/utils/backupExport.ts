export type SaveBackupResult = 'saved' | 'cancelled' | 'downloaded';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

export async function saveBackupFile(
  zipBlob: Blob,
  fileName: string
): Promise<SaveBackupResult> {
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

  if ('showSaveFilePicker' in window) {
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
      await writable.write(zipBlob);
      await writable.close();
      return 'saved';
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        return 'cancelled';
      }
      downloadZip();
      return 'downloaded';
    }
  } else {
    downloadZip();
    return 'downloaded';
  }
}

export function getBackupSaveToast(result: SaveBackupResult): string | null {
  switch (result) {
    case 'saved':
      return 'ZIP 백업 파일로 저장했어요.';
    case 'downloaded':
      if (isIOS() || isMobile()) {
        return '다운로드 폴더에 저장됐어요.';
      }
      return '다운로드 폴더에 저장했어요.';
    case 'cancelled':
      return null;
  }
}