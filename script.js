document.addEventListener('DOMContentLoaded', () => {
  // === 1. 分頁切換邏輯 ===
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // 檢查手機裡有沒有記住上一次的分頁？如果有，就載入那個分頁；沒有就預設為 tab-1
  const savedTab = localStorage.getItem('lastActiveTab') || 'tab-1';

  // ★ 關鍵修正：在套用記憶之前，先強制清除所有按鈕與內容的啟用狀態
  tabBtns.forEach(b => b.classList.remove('active'));
  tabContents.forEach(c => c.classList.remove('active'));

  tabBtns.forEach(btn => {
    // 網頁剛載入時，自動幫你切換到記憶中的分頁
    if (btn.getAttribute('data-target') === savedTab) {
      btn.classList.add('active');
      document.getElementById(savedTab).classList.add('active');
      // 如果記住的是其他分頁，把導航列自動捲動過去，避免按鈕藏在畫面外
      btn.scrollIntoView({ behavior: 'instant', inline: 'center' });
    }

    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');

      // ★ 每次切換分頁，就把這個分頁 ID 記在手機裡
      localStorage.setItem('lastActiveTab', targetId);
    });
  });

  // === 2. 戰利品紀錄邏輯 (支援新增、修改、刪除) ===
  const saveBtn = document.getElementById('save-btn');
  const nameInput = document.getElementById('item-name');
  const priceInput = document.getElementById('item-price');
  const gallery = document.getElementById('gallery');

 // 取代原本的 photoInput 與 photoLabel
  const cameraInput = document.getElementById('photo-upload-camera');
  const galleryInput = document.getElementById('photo-upload-gallery');
  const photoBtns = document.querySelectorAll('.photo-btn');

  const previewContainer = document.getElementById('preview-container');
  const previewImg = document.getElementById('preview-img');

  // 共用的照片處理函數 (無論是拍照還是選相簿，都走這裡)
  const processImage = function(e) {
    const file = e.target.files[0];
    if (!file) return; // 如果使用者按取消，直接中斷，保留畫面上的舊照片
    const reader = new FileReader();
    reader.onload = function(event) {
      currentBase64Image = event.target.result;
      if (previewContainer && previewImg) {
        previewImg.src = currentBase64Image;
        previewContainer.style.display = 'block';
      }
      photoBtns.forEach(btn => {
        btn.style.backgroundColor = "#d1d5a7";
      });
    };
    reader.readAsDataURL(file);
  };
  // ★ 關鍵修正：在點擊(click)時先清空 value，確保每次 change 事件都會強制觸發
  if (cameraInput) {
    cameraInput.addEventListener('click', function() { this.value = ''; });
    cameraInput.addEventListener('change', processImage);
  }
  if (galleryInput) {
    galleryInput.addEventListener('click', function() { this.value = ''; });
    galleryInput.addEventListener('change', processImage);
  }

  let editingId = null; // 用來記錄目前正在編輯哪一筆資料 (null 代表新增模式)
  let currentBase64Image = null; // ★ 新增：用來暫存剛拍好的照片資料

  // 初始化讀取歷史紀錄
  loadGallery();

  // 儲存/更新按鈕點擊事件
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();

    const name = nameInput.value;
    const price = priceInput.value;

    if (!name || !price) {
      alert("請輸入名稱與價格！");
      return;
    }

    // 新增模式下，必須要拍照/上傳照片
    if (!editingId && !currentBase64Image) {
      alert("請拍攝或上傳戰利品照片！");
      return;
    }

    saveData(currentBase64Image, name, price);
  });

  // 實際寫入資料庫的共用函數
  function saveData(base64Image, name, price) {
    localforage.getItem('shoppingList').then(list => {
      let currentList = list || [];

      if (editingId) {
        // 編輯模式：找到該筆資料並更新
        const itemIndex = currentList.findIndex(item => item.id === editingId);
        if (itemIndex > -1) {
          currentList[itemIndex].name = name;
          currentList[itemIndex].price = price;
          // 如果有傳入新照片才替換，否則保留舊照片
          if (base64Image) {
            currentList[itemIndex].image = base64Image;
          }
        }
      } else {
        // 新增模式：建立新資料
        const newItem = { id: Date.now(), image: base64Image, name: name, price: price };
        currentList.push(newItem);
      }

      return localforage.setItem('shoppingList', currentList);
    }).then(() => {
      resetForm();
      loadGallery();
    }).catch(err => console.log(err));
  }

  // 7. 清空表單與隱藏預覽
  function resetForm() {
    if (cameraInput) cameraInput.value = '';
    if (galleryInput) galleryInput.value = '';
    nameInput.value = '';
    priceInput.value = '';
    editingId = null;
    currentBase64Image = null;
    saveBtn.textContent = "儲存紀錄";
    
    // 恢復按鈕預設顏色
    if (photoBtns) {
      photoBtns.forEach(btn => btn.style.backgroundColor = "var(--secondary-color)");
    }
    // 隱藏預覽區塊
    if (previewContainer) {
      previewContainer.style.display = 'none';
      previewImg.src = "";
    }
  }
  // 讀取並渲染照片牆
  function loadGallery() {
    localforage.getItem('shoppingList').then(list => {
      gallery.innerHTML = '';
      if (list) {
        // 使用 slice() 複製陣列再反轉，最新買的排在最上面
        list.slice().reverse().forEach(item => {
          const div = document.createElement('div');
          div.className = 'gallery-item';
          div.innerHTML = `
            <img src="${item.image}" alt="photo">
            <p>${item.name}</p>
            <p style="color:#e8c7c8; font-weight:bold;">¥ ${item.price}</p>
            <div class="item-actions">
              <button class="edit-btn" data-id="${item.id}">編輯</button>
              <button class="delete-btn" data-id="${item.id}">刪除</button>
            </div>
          `;
          gallery.appendChild(div);
          // 綁定點擊圖片放大功能
          const imgElement = div.querySelector('img');
          imgElement.addEventListener('click', function() {
            document.getElementById('enlarged-img').src = item.image;
            document.getElementById('image-modal').style.display = 'flex';
          });
        });

        // 綁定所有「編輯」按鈕的功能
        document.querySelectorAll('.edit-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const id = Number(this.getAttribute('data-id'));
            editItem(id, list);
          });
        });

        // 綁定所有「刪除」按鈕的功能
        document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const id = Number(this.getAttribute('data-id'));
            deleteItem(id);
          });
        });
      }
    });
  }

  // 5. 進入編輯模式 (加入照片預覽還原功能)
  function editItem(id, list) {
    const item = list.find(i => i.id === id);
    if (item) {
      nameInput.value = item.name;
      priceInput.value = item.price;
      editingId = id;
      saveBtn.textContent = "更新紀錄";

      // ★ 新增：進入編輯模式時，把資料庫裡的舊照片顯示在預覽區
      currentBase64Image = item.image || null; 
      if (previewContainer && previewImg && currentBase64Image) {
        previewImg.src = currentBase64Image;
        previewContainer.style.display = 'block';
        
        photoBtns.forEach(btn => {
          btn.style.backgroundColor = "#d1d5a7";
        });
      }
      
      document.getElementById('tab-7').scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 刪除該筆資料
  function deleteItem(id) {
    if (confirm("確定要刪除這筆戰利品紀錄嗎？")) {
      localforage.getItem('shoppingList').then(list => {
        const updatedList = list.filter(item => item.id !== id);
        return localforage.setItem('shoppingList', updatedList);
      }).then(() => {
        // 如果刪除的剛好是正在編輯的那一筆，順便清空表單
        if (editingId === id) {
          resetForm();
        }
        loadGallery();
      });
    }
  }
  
});