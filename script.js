let productCatalog = [];
let sortType = 'name';
let priceSortDirection = 'desc';
let nameSortDirection = 'asc';

// Флаг и таймер для управления обновлениями
let updateTimeout = null;
let isUpdating = false;

function confirmDelete(action, callback) {
  const message = action === 'product' 
    ? 'Вы уверены, что хотите удалить этот ингредиент? 🗑️'
    : 'Вы уверены, что хотите очистить все строки расчёта? 🍳';
  
  if (confirm(message)) {
    callback();
  }
}

function productsEqual(a, b) {
  return (
    a.name === b.name &&
    a.pack === b.pack &&
    a.unit === b.unit &&
    Math.abs(a.price - b.price) < 0.001 &&
    Math.abs(a.protein - b.protein) < 0.001 &&
    Math.abs(a.fat - b.fat) < 0.001 &&
    Math.abs(a.carbs - b.carbs) < 0.001 &&
    Math.abs(a.calories - b.calories) < 0.001
  );
}

function openTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
}

function loadAllData() {
  const saved = localStorage.getItem('productCatalog');
  productCatalog = saved ? JSON.parse(saved) : [];
  renderProductList();

  const savedRows = JSON.parse(localStorage.getItem('calcRows') || '[]');
  const container = document.getElementById('inputs');
  container.innerHTML = '';
  savedRows.forEach(row => addCalcRowWithData(row.product, row.qty));

  const savedRecipeName = localStorage.getItem('recipeName');
  document.getElementById('recipeName').value = savedRecipeName || 'Рецепт';
  document.getElementById('recipeName').addEventListener('input', () => {
    localStorage.setItem('recipeName', document.getElementById('recipeName').value);
    scheduleUpdate();
  });

  loadMarkup();
  updateResult();
}

function loadMarkup() {
  const saved = localStorage.getItem('markupData');
  const data = saved ? JSON.parse(saved) : {
    laborValue: '0',
    laborType: 'fixed',
    delivery: '0',
    packaging: '0'
  };
  
  document.getElementById('laborValue').value = data.laborValue;
  document.getElementById('laborType').value = data.laborType;
  document.getElementById('delivery').value = data.delivery;
  document.getElementById('packaging').value = data.packaging;
}

function saveMarkup() {
  const data = {
    laborValue: document.getElementById('laborValue').value || '0',
    laborType: document.getElementById('laborType').value,
    delivery: document.getElementById('delivery').value || '0',
    packaging: document.getElementById('packaging').value || '0'
  };
  localStorage.setItem('markupData', JSON.stringify(data));
  scheduleUpdate();
  alert('Настройки сохранены! 🍳');
}

function getMarkupData() {
  const saved = localStorage.getItem('markupData');
  return saved ? JSON.parse(saved) : {
    laborValue: '0',
    laborType: 'fixed',
    delivery: '0',
    packaging: '0'
  };
}

function saveCatalog() {
  localStorage.setItem('productCatalog', JSON.stringify(productCatalog));
  renderProductList();
}

function formatProductLabel(item, mobile = false) {
  if (mobile && window.innerWidth <= 600) {
    return `${item.name} (${item.price.toFixed(2)} ₽)`;
  }
  const nutrition = `${item.protein.toFixed(1)} белки, ${item.fat.toFixed(1)} жиры, ${item.carbs.toFixed(1)} углеводы, ${Math.round(item.calories)} ккал`;
  return `${item.name} (${item.pack} ${item.unit}/${item.price.toFixed(2)} ₽) — ${nutrition}`;
}

function renderProductList() {
  const listEl = document.getElementById('productListDisplay');
  listEl.innerHTML = '';

  let sorted = [...productCatalog];

  if (sortType === 'name') {
    if (nameSortDirection === 'asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } else {
      sorted.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
    }
  } else if (sortType === 'price-asc') {
    sorted.sort((a, b) => a.price - b.price);
  } else if (sortType === 'price-desc') {
    sorted.sort((a, b) => b.price - b.price);
  }

  sorted.forEach(item => {
    const div = document.createElement('div');
    div.className = 'product-item';
    const origIndex = productCatalog.indexOf(item);
    div.innerHTML = `
      <span><strong>${formatProductLabel(item)}</strong></span>
      <div>
        <button type="button" class="edit-product-btn" data-index="${origIndex}">✏️</button>
        <button type="button" class="remove-product-btn" data-index="${origIndex}">🗑️</button>
      </div>
    `;
    listEl.appendChild(div);
  });
}

function toggleNameSort() {
  nameSortDirection = nameSortDirection === 'asc' ? 'desc' : 'asc';
  sortType = 'name';
  renderProductList();

  const btn = document.getElementById('toggleNameSortBtn');
  if (btn) {
    btn.textContent = `📝 Сортировать: ${nameSortDirection === 'asc' ? 'А-Я' : 'Я-А'}`;
  }
}

function togglePriceSort() {
  priceSortDirection = priceSortDirection === 'desc' ? 'asc' : 'desc';
  sortType = priceSortDirection === 'asc' ? 'price-asc' : 'price-desc';
  renderProductList();

  const btn = document.getElementById('togglePriceSortBtn');
  if (btn) {
    btn.textContent = `💰 Сортировать: Цена ${priceSortDirection === 'desc' ? '⬇' : '⬆'}`;
  }
}

function editProduct(index) {
  const item = productCatalog[index];
  const productItem = document.querySelector(`.product-item .edit-product-btn[data-index="${index}"]`)?.closest('.product-item');
  if (!productItem) return;

  const formDiv = document.createElement('div');
  formDiv.className = 'edit-form';
  formDiv.innerHTML = `
    <input type="text" value="${item.name}" data-field="name" style="width:120px;" placeholder="Название">
    <input type="text" value="${item.pack}" data-field="pack" style="width:80px;" placeholder="Упак.">
    <select data-field="unit" style="width:90px;">
      <option value="шт" ${item.unit === 'шт' ? 'selected' : ''}>🥚 шт</option>
      <option value="мл" ${item.unit === 'мл' ? 'selected' : ''}>🥛 мл</option>
      <option value="гр" ${item.unit === 'гр' ? 'selected' : ''}>⚖️ гр</option>
    </select>
    <input type="text" value="${item.price}" data-field="price" style="width:90px;" placeholder="Цена">
    
    <input type="text" value="${item.protein}" data-field="protein" placeholder="Белки" style="width:70px;">
    <input type="text" value="${item.fat}" data-field="fat" placeholder="Жиры" style="width:70px;">
    <input type="text" value="${item.carbs}" data-field="carbs" placeholder="Угл." style="width:70px;">
    <input type="text" value="${item.calories}" data-field="calories" placeholder="Ккал" style="width:70px;">
    
    <button type="button" class="save-edit-btn" data-index="${index}">✅</button>
    <button type="button" class="cancel-edit-btn" data-index="${index}">❌</button>
  `;
  productItem.innerHTML = '';
  productItem.appendChild(formDiv);
}

function saveEdit(index, btn) {
  const form = btn.closest('.edit-form');
  const name = form.querySelector('[data-field="name"]').value.trim();
  const pack = parseFloat(form.querySelector('[data-field="pack"]').value.replace(',', '.')) || 1;
  const unit = form.querySelector('[data-field="unit"]').value;
  const price = parseFloat(form.querySelector('[data-field="price"]').value.replace(',', '.')) || 0;

  const protein = parseFloat(form.querySelector('[data-field="protein"]')?.value.replace(',', '.')) || 0;
  const fat = parseFloat(form.querySelector('[data-field="fat"]')?.value.replace(',', '.')) || 0;
  const carbs = parseFloat(form.querySelector('[data-field="carbs"]')?.value.replace(',', '.')) || 0;
  const calories = parseFloat(form.querySelector('[data-field="calories"]')?.value.replace(',', '.')) || 0;

  if (!name) {
    alert('Название не может быть пустым');
    return;
  }

  const newProduct = { name, pack, unit, price, protein, fat, carbs, calories };
  const exists = productCatalog.some((p, i) => i !== index && productsEqual(p, newProduct));

  if (exists) {
    alert('Такой продукт уже существует');
    return;
  }

  productCatalog[index] = newProduct;
  saveCatalog();
  updateAllCalcSelects();
}

function cancelEdit(index) {
  renderProductList();
}

function removeProduct(index) {
  confirmDelete('product', () => {
    productCatalog.splice(index, 1);
    saveCatalog();
    updateAllCalcSelects();
  });
}

function addProductToList() {
  const name = document.getElementById('newProductName').value.trim();
  const pack = parseFloat(document.getElementById('newProductPack').value.replace(',', '.')) || 1;
  const unit = document.getElementById('newProductUnit').value;
  const price = parseFloat(document.getElementById('newProductPrice').value.replace(',', '.')) || 0;
  
  const protein = parseFloat(document.getElementById('newProtein').value.replace(',', '.')) || 0;
  const fat = parseFloat(document.getElementById('newFat').value.replace(',', '.')) || 0;
  const carbs = parseFloat(document.getElementById('newCarbs').value.replace(',', '.')) || 0;
  const calories = parseFloat(document.getElementById('newCalories').value.replace(',', '.')) || 0;

  if (!name) {
    alert('Введите название');
    return;
  }

  const newProduct = { name, pack, unit, price, protein, fat, carbs, calories };
  const exists = productCatalog.some(p => productsEqual(p, newProduct));

  if (exists) {
    alert('Такой продукт уже существует');
    return;
  }

  productCatalog.push(newProduct);
  saveCatalog();
  updateAllCalcSelects();

  document.getElementById('newProductName').value = '';
  document.getElementById('newProductPack').value = '1';
  document.getElementById('newProductPrice').value = '';
  document.getElementById('newProtein').value = '';
  document.getElementById('newFat').value = '';
  document.getElementById('newCarbs').value = '';
  document.getElementById('newCalories').value = '';
}

function getProductInfo(name) {
  return productCatalog.find(p => p.name === name) || { name, pack: 1, unit: 'шт', price: 0, protein: 0, fat: 0, carbs: 0, calories: 0 };
}

function createProductSelect(selectedName = '') {
  const select = document.createElement('select');

  if (productCatalog.length === 0) {
    select.innerHTML = '<option>— Нет доступных —</option>';
    select.disabled = true;
  } else {
    select.innerHTML = '<option>— Выберите ингредиент —</option>';
    productCatalog.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.name;
      opt.textContent = formatProductLabel(item, false);
      if (item.name === selectedName) opt.selected = true;
      select.appendChild(opt);
    });
  }
  return select;
}

// Функция для валидации числового ввода
function validateNumberInput(value, allowDecimal = true) {
  // Заменяем запятую на точку
  value = value.replace(',', '.');
  
  // Удаляем все, кроме цифр и точки (если разрешено)
  if (allowDecimal) {
    value = value.replace(/[^\d.]/g, '');
    // Удаляем лишние точки
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
  } else {
    value = value.replace(/\D/g, '');
  }
  
  return value;
}

function createQtyInput(unit, value = '') {
  const input = document.createElement('input');
  input.type = 'text'; // Меняем на text для мобильных устройств
  input.value = value;
  
  // Атрибуты для лучшей работы на мобильных
  input.setAttribute('inputmode', 'decimal');
  input.setAttribute('pattern', '[0-9]*[.,]?[0-9]*');
  
  // Стили для предотвращения проблем с фокусом
  input.style.cssText = `
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
    -webkit-tap-highlight-color: transparent;
    appearance: none;
  `;
  
  if (unit === 'мл') {
    input.placeholder = 'мл';
  } else if (unit === 'гр') {
    input.placeholder = 'гр';
  } else {
    input.placeholder = 'шт';
  }
  
  // Обработчик ввода для валидации
  input.addEventListener('input', function(e) {
    const cursorPosition = this.selectionStart;
    const oldValue = this.value;
    
    // Валидируем ввод
    this.value = validateNumberInput(this.value, unit !== 'шт');
    
    // Восстанавливаем позицию курсора
    const diff = this.value.length - oldValue.length;
    this.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
    
    scheduleUpdate();
  });
  
  // Обработчик для blur (когда поле теряет фокус)
  input.addEventListener('blur', function() {
    // Очищаем поле, если там только точка или запятая
    if (this.value === '.' || this.value === ',') {
      this.value = '';
    }
    scheduleUpdate();
  });
  
  return input;
}

function createUnitLabel(unit) {
  const span = document.createElement('span');
  span.className = 'unit-label';
  span.textContent = unit;
  return span;
}

function updateAllCalcSelects() {
  document.querySelectorAll('#inputs .row').forEach(row => {
    const oldSelect = row.querySelector('select');
    const inputGroup = row.querySelector('.input-group');
    const oldQtyInput = inputGroup.querySelector('input[type="text"]');
    const oldUnitLabel = inputGroup.querySelector('.unit-label');

    const selectedName = oldSelect.value;
    const newSelect = createProductSelect(selectedName);
    const unit = getProductInfo(selectedName).unit;
    const newQtyInput = createQtyInput(unit, oldQtyInput.value);
    const newUnitLabel = createUnitLabel(unit);

    newSelect.onchange = () => {
      const qtyInput = inputGroup.querySelector('input[type="text"]');
      const unitLabel = inputGroup.querySelector('.unit-label');
      const newUnit = getProductInfo(newSelect.value).unit;
      const newQty = createQtyInput(newUnit, qtyInput.value);
      const newUnitEl = createUnitLabel(newUnit);
      qtyInput.replaceWith(newQty);
      unitLabel.replaceWith(newUnitEl);
      scheduleUpdate();
    };

    oldSelect.replaceWith(newSelect);
    oldQtyInput.replaceWith(newQtyInput);
    oldUnitLabel.replaceWith(newUnitLabel);
  });
  scheduleUpdate();
}

function addCalcRow() {
  if (productCatalog.length === 0) {
    alert('Сначала добавьте ингредиенты во вкладке "Ингредиенты" 🥕');
    openTab('products');
    return;
  }
  addCalcRowWithData('', '');
}

function addCalcRowWithData(productName = '', qty = '') {
  const container = document.getElementById('inputs');
  const div = document.createElement('div');
  div.className = 'row';

  const select = createProductSelect(productName);
  const unit = productName ? getProductInfo(productName).unit : 'шт';
  const qtyInput = createQtyInput(unit, qty);
  const unitLabel = createUnitLabel(unit);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.classList.add('delete-row-btn');
  deleteBtn.type = 'button';

  const inputGroup = document.createElement('div');
  inputGroup.className = 'input-group';
  
  select.onchange = () => {
    const newUnit = getProductInfo(select.value).unit;
    const newQty = createQtyInput(newUnit, qtyInput.value);
    const newUnitEl = createUnitLabel(newUnit);
    qtyInput.replaceWith(newQty);
    unitLabel.replaceWith(newUnitEl);
    scheduleUpdate();
  };

  inputGroup.append(qtyInput, unitLabel, deleteBtn);
  div.append(select, inputGroup);
  container.appendChild(div);
  
  scheduleUpdate();
  return div;
}

function clearAllRows() {
  if (document.querySelectorAll('#inputs .row').length === 0) return;
  confirmDelete('all', () => {
    document.getElementById('inputs').innerHTML = '';
    scheduleUpdate();
  });
}

// Функция для отложенного обновления
function scheduleUpdate() {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  
  updateTimeout = setTimeout(() => {
    if (!isUpdating) {
      isUpdating = true;
      updateResult();
      saveCalcRows();
      isUpdating = false;
    }
  }, 300); // 300ms задержка
}

function updateResult() {
  const detailed = document.getElementById('detailedMode') ? document.getElementById('detailedMode').checked : true;
  const recipeName = document.getElementById('recipeName').value.trim() || 'Мой рецепт';
  let baseTotal = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let totalCalories = 0;
  let totalWeight = 0;
  let details = '';
  let simpleLines = [];

  document.querySelectorAll('#inputs .row').forEach(row => {
    const select = row.querySelector('select');
    const qtyInput = row.querySelector('.input-group input[type="text"]');
    const productName = select.value;
    if (!productName || productName === '— Выберите ингредиент —') return;

    const product = getProductInfo(productName);
    const qtyValue = qtyInput.value.replace(',', '.');
    const qty = parseFloat(qtyValue) || 0;
    const pricePerUnit = product.price / product.pack;
    const cost = qty * pricePerUnit;
    baseTotal += cost;

    if (product.unit === 'гр' || product.unit === 'мл') {
      const factor = qty / 100;
      totalWeight += qty;
      totalProtein += product.protein * factor;
      totalFat += product.fat * factor;
      totalCarbs += product.carbs * factor;
      totalCalories += product.calories * factor;
    }

    if (detailed) {
      let protein = 0, fat = 0, carbs = 0, calories = 0;
      if (product.unit === 'гр' || product.unit === 'мл') {
        const factor = qty / 100;
        protein = product.protein * factor;
        fat = product.fat * factor;
        carbs = product.carbs * factor;
        calories = product.calories * factor;
      }

      const productLabel = formatProductLabel(product);
      details += `${productLabel}:\n`;
      details += `  ${qty} ${product.unit} → `;
      details += `${protein.toFixed(2)} белки, ${fat.toFixed(2)} жиры, ${carbs.toFixed(2)} углеводы, ${Math.round(calories)} ккал\n`;
      details += `  Себестоимость: ${cost.toFixed(2)} ₽\n\n`;
    } else {
      simpleLines.push(`${product.name}: ${qty} ${product.unit}`);
    }
  });

  const markup = getMarkupData();
  let laborCost = 0;
  const laborValue = parseFloat(markup.laborValue) || 0;
  const deliveryCost = parseFloat(markup.delivery) || 0;
  const packagingCost = parseFloat(markup.packaging) || 0;

  if (markup.laborType === 'percent') {
    laborCost = baseTotal * (laborValue / 100);
  } else {
    laborCost = laborValue;
  }

  const hasMarkup = laborCost > 0 || deliveryCost > 0 || packagingCost > 0;
  const total = hasMarkup ? (baseTotal + laborCost + deliveryCost + packagingCost) : baseTotal;

  let text = '';
  if (detailed) {
    if (details) {
      text = `🍽️ Название рецепта: ${recipeName}\n\n${details}`;
      text += `⚖️ Общий вес: ${totalWeight.toFixed(1)} г\n`;

      if (totalWeight > 0) {
        const per100Protein = (totalProtein / totalWeight) * 100;
        const per100Fat = (totalFat / totalWeight) * 100;
        const per100Carbs = (totalCarbs / totalWeight) * 100;
        const per100Calories = (totalCalories / totalWeight) * 100;

        text += `\n🥗 Пищевая ценность на 100 г:\n`;
        text += `  🥚 Белки: ${per100Protein.toFixed(2)} г\n`;
        text += `  🥑 Жиры: ${per100Fat.toFixed(2)} г\n`;
        text += `  🍚 Углеводы: ${per100Carbs.toFixed(2)} г\n`;
        text += `  🔥 Ккал: ${Math.round(per100Calories)}\n`;
      } else {
        text += `\n🥗 Пищевая ценность (общая):\n`;
        text += `  🥚 Белки: ${totalProtein.toFixed(2)} г\n`;
        text += `  🥑 Жиры: ${totalFat.toFixed(2)} г\n`;
        text += `  🍚 Углеводы: ${totalCarbs.toFixed(2)} г\n`;
        text += `  🔥 Ккал: ${Math.round(totalCalories)}\n`;
      }

      if (hasMarkup) {
        text += `\n📊 Дополнительные расходы:\n`;
        if (laborCost > 0) text += `  👨‍🍳 Работа: ${laborCost.toFixed(2)} ₽\n`;
        if (deliveryCost > 0) text += `  🚚 Доставка: ${deliveryCost.toFixed(2)} ₽\n`;
        if (packagingCost > 0) text += `  🎁 Упаковка: ${packagingCost.toFixed(2)} ₽`;
      }

      text += `\n💰 Себестоимость ингредиентов: ${baseTotal.toFixed(2)} ₽`;
      if (hasMarkup) {
        text += `\n💰 Итоговая стоимость: ${total.toFixed(2)} ₽`;
      }
    } else {
      text = 'Добавьте ингредиенты для расчёта 🥕';
    }
  } else {
    if (simpleLines.length > 0) {
      text = `🍽️ Название рецепта: ${recipeName}\n${simpleLines.join('\n')}\n\n`;

      if (totalWeight > 0) {
        const per100Protein = (totalProtein / totalWeight) * 100;
        const per100Fat = (totalFat / totalWeight) * 100;
        const per100Carbs = (totalCarbs / totalWeight) * 100;
        const per100Calories = (totalCalories / totalWeight) * 100;

        text += `🥗 Пищевая ценность на 100 г:\n`;
        text += `🥚 Белки: ${per100Protein.toFixed(2)} г, 🥑 Жиры: ${per100Fat.toFixed(2)} г, 🍚 Углеводы: ${per100Carbs.toFixed(2)} г, 🔥 Ккал: ${Math.round(per100Calories)}\n`;
      } else {
        text += `🥗 Пищевая ценность (общая):\n`;
        text += `🥚 Белки: ${totalProtein.toFixed(2)} г, 🥑 Жиры: ${totalFat.toFixed(2)} г, 🍚 Углеводы: ${totalCarbs.toFixed(2)} г, 🔥 Ккал: ${Math.round(totalCalories)}\n`;
      }
    } else {
      text = 'Добавьте ингредиенты для расчёта 🥕';
    }
  }

  const resultEl = document.getElementById('result');
  const scrollTop = resultEl.scrollTop;
  resultEl.innerHTML = '';

  const textDiv = document.createElement('div');
  textDiv.style.whiteSpace = 'pre-wrap';
  textDiv.textContent = text;
  resultEl.appendChild(textDiv);

  const label = document.createElement('label');
  label.style.display = 'flex';
  label.style.alignItems = 'center';
  label.style.gap = '8px';
  label.style.fontSize = '14px';
  label.style.marginTop = '12px';
  label.innerHTML = `
    <input type="checkbox" id="detailedMode" ${detailed ? 'checked' : ''}>Подробный режим`;
  resultEl.appendChild(label);

  const copyIcon = document.createElement('button');
  copyIcon.id = 'copyIcon';
  copyIcon.innerHTML = '📋';
  copyIcon.title = 'Копировать результат';
  copyIcon.onclick = () => {
    navigator.clipboard?.writeText(text).then(() => {
      copyIcon.textContent = '✅';
      setTimeout(() => copyIcon.textContent = '📋', 1000);
    }).catch(() => {
      copyIcon.textContent = '⚠️';
      setTimeout(() => copyIcon.textContent = '📋', 1000);
    });
  };
  resultEl.appendChild(copyIcon);

  resultEl.scrollTop = scrollTop;
}

function saveCalcRows() {
  const rows = [];
  document.querySelectorAll('#inputs .row').forEach(row => {
    const select = row.querySelector('select');
    const qty = row.querySelector('.input-group input[type="text"]').value;
    if (select.value && select.value !== '— Выберите ингредиент —') {
      rows.push({ product: select.value, qty });
    }
  });
  localStorage.setItem('calcRows', JSON.stringify(rows));
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM загружен, инициализация...');
  
  // Обработчики вкладок
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = btn.getAttribute('data-tab');
      openTab(tabName);
    });
  });

  // Обработчики основных кнопок
  document.getElementById('addCalcRowBtn').addEventListener('click', addCalcRow);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllRows);
  document.getElementById('addProductBtn').addEventListener('click', addProductToList);
  document.getElementById('toggleNameSortBtn').addEventListener('click', toggleNameSort);
  document.getElementById('togglePriceSortBtn').addEventListener('click', togglePriceSort);
  document.getElementById('saveMarkupBtn').addEventListener('click', saveMarkup);

  // Делегирование событий для списка продуктов
  document.getElementById('productListDisplay').addEventListener('click', (e) => {
    const target = e.target;
    
    if (target.classList.contains('edit-product-btn')) {
      const index = parseInt(target.getAttribute('data-index'));
      editProduct(index);
    } else if (target.classList.contains('remove-product-btn')) {
      const index = parseInt(target.getAttribute('data-index'));
      removeProduct(index);
    } else if (target.classList.contains('save-edit-btn')) {
      const index = parseInt(target.getAttribute('data-index'));
      saveEdit(index, target);
    } else if (target.classList.contains('cancel-edit-btn')) {
      const index = parseInt(target.getAttribute('data-index'));
      cancelEdit(index);
    }
  });

  // Делегирование событий для кнопок удаления в строках расчета
  document.getElementById('inputs').addEventListener('click', (e) => {
    const target = e.target;
    
    if (target.classList.contains('delete-row-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      const row = target.closest('.row');
      if (row) {
        row.remove();
        scheduleUpdate();
      }
    }
  });

  // Обработчик для чекбокса подробного режима
  document.addEventListener('change', (e) => {
    if (e.target.id === 'detailedMode') {
      scheduleUpdate();
    }
  });

  // Обработчик для изменений в дополнительных расходах
  document.getElementById('markup')?.addEventListener('input', (e) => {
    if (e.target.matches('input[type="text"]') || e.target.matches('input[type="number"]') || e.target.matches('select')) {
      scheduleUpdate();
    }
  });

  // Также обновляем обработку других числовых полей
  document.querySelectorAll('input[type="number"]').forEach(input => {
    // Заменяем type="number" на type="text" для мобильных
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      input.type = 'text';
      input.setAttribute('inputmode', 'decimal');
    }
  });

  window.addEventListener('resize', () => {
    updateAllCalcSelects();
  });

  // Загружаем данные
  loadAllData();
  
  console.log('Инициализация завершена');
});
