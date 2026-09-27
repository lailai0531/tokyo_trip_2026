document.addEventListener('DOMContentLoaded', () => {
  // === 1. 分頁切換邏輯 ===
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // === 2. 戰利品紀錄邏輯 (支援新增、修改、刪除) ===
  const saveBtn = document.getElementById('save-btn');
  const photoInput = document.getElementById('photo-upload');
  const nameInput = document.getElementById('item-name');
  const priceInput = document.getElementById('item-price');
  const gallery = document.getElementById('gallery');

  const photoLabel = document.querySelector('label[for="photo-upload"]');
  const previewContainer = document.getElementById('preview-container');
  const previewImg = document.getElementById('preview-img');

  photoInput.addEventListener('change',function(e) {
    const file = e.target.files[0];
    if (file) {
      // 讀取檔案轉為 Base64
      const reader = new FileReader();
      reader.onload = function(event) {
        currentBase64Image = event.target.result; // 存入暫存變數
        
        // 顯示預覽畫面
        if (previewContainer && previewImg) {
          previewImg.src = currentBase64Image;
          previewContainer.style.display = 'block';
        }
        
        // 更新按鈕狀態
        if (photoLabel) {
          photoLabel.textContent = "✅ 照片已載入 (點擊可重拍)";
          photoLabel.style.backgroundColor = "var(--secondary-color)";
        }
      };
      reader.readAsDataURL(file); // 啟動讀取
    }
  });

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

  // ★ 3. 清空表單與重置狀態 (包含隱藏預覽圖)
  function resetForm() {
    photoInput.value = '';
    nameInput.value = '';
    priceInput.value = '';
    editingId = null;
    currentBase64Image = null; // 清空照片暫存
    saveBtn.textContent = "儲存紀錄";

    // 恢復拍照按鈕預設樣式
    if (photoLabel) {
      photoLabel.textContent = "📷 拍攝或上傳帳單";
      photoLabel.style.backgroundColor = "";
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

  // 進入編輯模式
  function editItem(id, list) {
    const item = list.find(i => i.id === id);
    if (item) {
      nameInput.value = item.name;
      priceInput.value = item.price;
      editingId = id;
      saveBtn.textContent = "更新紀錄"; // 提示使用者現在是編輯狀態
      
      // 自動畫面滾動到最上面，方便編輯表單
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