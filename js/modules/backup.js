window.PhantomBackup = {
  initBackup(renderAllCallback) {
    const { getTodayStr, toast } = window.PhantomUtils;
    const { state, CATS_DEFAULT, saveData } = window.PhantomStorage;

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const jsonStr = JSON.stringify(state.data, null, 2);
        const defaultFileName = `기록장-백업-${getTodayStr()}.json`;

        if ('showSaveFilePicker' in window) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: defaultFileName,
              types: [{
                description: 'JSON File',
                accept: { 'application/json': ['.json'] }
              }]
            });
            const writable = await handle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            toast('JSON 파일로 저장했어요.');
          } catch (err) {
            if (err.name !== 'AbortError') {
              toast('파일 저장 중 오류가 발생했습니다.');
            }
          }
        } else {
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultFileName;
          a.click();
          URL.revokeObjectURL(url);
          toast('JSON 파일로 저장했어요.');
        }
      });
    }

    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const parsed = JSON.parse(reader.result);
            state.data = {
              posts: parsed.posts || [],
              todos: parsed.todos || [],
              monthly: parsed.monthly || {},
              categories: (parsed.categories && parsed.categories.length) ? parsed.categories : JSON.parse(JSON.stringify(CATS_DEFAULT))
            };
            await saveData();
            if (typeof renderAllCallback === 'function') renderAllCallback();
            toast('데이터를 불러왔어요.');
          } catch (err) {
            toast('파일을 읽을 수 없어요. JSON 형식을 확인해주세요.');
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      });
    }
  }
};
