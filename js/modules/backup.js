window.PhantomBackup = {
  async saveBlob(blob, fileName, fileTypes, successMsg) {
    const { toast } = window.PhantomUtils;
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: fileTypes
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast(successMsg);
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast('파일 저장 중 오류가 발생했습니다.');
        }
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast(successMsg);
    }
  },

  initBackup(renderAllCallback) {
    const { getTodayStr, toast } = window.PhantomUtils;
    const { state, CATS_DEFAULT, saveData } = window.PhantomStorage;

    document.getElementById('exportBtn')?.addEventListener('click', async () => {
      try {
        const jsonStr = JSON.stringify(state.data, null, 2);
        const zip = new JSZip();
        zip.file('backup.json', jsonStr);

        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });

        const defaultFileName = `기록장-백업-${getTodayStr()}.zip`;

        await window.PhantomBackup.saveBlob(
          zipBlob,
          defaultFileName,
          [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }],
          'ZIP 백업 파일로 저장했어요.'
        );
      } catch (e) {
        console.error(e);
        toast('백업 생성 중 오류가 발생했습니다.');
      }
    });

    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          let jsonText = '';
          if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
            const zip = await JSZip.loadAsync(file);
            const jsonFile = zip.file('backup.json') || Object.values(zip.files).find(f => !f.dir && f.name.endsWith('.json'));
            if (!jsonFile) {
              throw new Error('ZIP 내에서 백업 JSON 파일을 찾을 수 없습니다.');
            }
            jsonText = await jsonFile.async('text');
          } else {
            jsonText = await file.text();
          }

          const parsed = JSON.parse(jsonText);
          state.data = {
            posts: parsed.posts || [],
            todos: parsed.todos || [],
            monthly: parsed.monthly || {},
            categories: (parsed.categories && parsed.categories.length) ? parsed.categories : JSON.parse(JSON.stringify(CATS_DEFAULT))
          };
          await saveData();
          if (typeof renderAllCallback === 'function') renderAllCallback();
          toast('데이터를 성공적으로 불러왔어요.');
        } catch (err) {
          console.error(err);
          toast('파일을 읽을 수 없어요. 유효한 백업 파일인지 확인해주세요.');
        }
        e.target.value = '';
      });
    }
  }
};
