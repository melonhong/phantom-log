export type SaveBackupResult = 'saved' | 'cancelled' | 'downloaded';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

import { AppState, Post, Todo, Goal } from '../types';

// 동기화: 로컬 데이터와 백업 데이터를 병합합니다.
// 규칙:
//   - id 기준으로 양쪽에 모두 존재하면 updatedAt이 더 나중인 버전을 최종본으로 선택
//   - isDeleted=true인 항목은 삭제 상태 그대로 유지 (Soft Delete 존중)
//   - 한쪽에만 있는 항목은 그대로 포함
export function mergeAppState(local: AppState, backup: AppState): AppState {
  // -- Posts 병합 --
  const postMap = new Map<string, Post>();
  for (const p of local.posts) postMap.set(p.id, p);
  for (const p of backup.posts) {
    const existing = postMap.get(p.id);
    if (!existing) {
      postMap.set(p.id, p);
    } else {
      const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const backupTime = new Date(p.updatedAt || p.createdAt || 0).getTime();
      // 더 나중 버전 선택; isDeleted=true 우선 (삭제는 취소 불가)
      const winner = backupTime >= localTime ? p : existing;
      postMap.set(p.id, {
        ...winner,
        isDeleted: existing.isDeleted || p.isDeleted,
      });
    }
  }

  // -- Todos 병합 --
  const todoMap = new Map<string, Todo>();
  for (const t of local.todos) todoMap.set(t.id, t);
  for (const t of backup.todos) {
    const existing = todoMap.get(t.id);
    if (!existing) {
      todoMap.set(t.id, t);
    } else {
      const localTime = new Date(existing.updatedAt || 0).getTime();
      const backupTime = new Date(t.updatedAt || 0).getTime();
      todoMap.set(t.id, backupTime >= localTime ? t : existing);
    }
  }

  // -- Monthly Goals 병합 --
  const allMonthKeys = new Set([
    ...Object.keys(local.monthly),
    ...Object.keys(backup.monthly),
  ]);
  const mergedMonthly: AppState['monthly'] = {};
  for (const monthKey of allMonthKeys) {
    const localMonth = local.monthly[monthKey] || { goals: [], retro: '' };
    const backupMonth = backup.monthly[monthKey] || { goals: [], retro: '' };

    // Goals 병합
    const goalMap = new Map<string, Goal>();
    for (const g of localMonth.goals) goalMap.set(g.id, g);
    for (const g of backupMonth.goals) {
      const existing = goalMap.get(g.id);
      if (!existing) {
        goalMap.set(g.id, g);
      } else {
        const localTime = new Date(existing.updatedAt || 0).getTime();
        const backupTime = new Date(g.updatedAt || 0).getTime();
        goalMap.set(g.id, backupTime >= localTime ? g : existing);
      }
    }

    // Retro: updatedAt이 없으므로 둘 다 있으면 백업 우선 (또는 더 긴 텍스트)
    const retro =
      backupMonth.retro && backupMonth.retro.length >= localMonth.retro.length
        ? backupMonth.retro
        : localMonth.retro;

    mergedMonthly[monthKey] = {
      goals: Array.from(goalMap.values()),
      retro,
    };
  }

  // -- Categories: 백업 우선, 없으면 로컬 --
  const mergedCategories =
    backup.categories && backup.categories.length
      ? backup.categories
      : local.categories;

  return {
    posts: Array.from(postMap.values()),
    todos: Array.from(todoMap.values()),
    monthly: mergedMonthly,
    categories: mergedCategories,
  };
}

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