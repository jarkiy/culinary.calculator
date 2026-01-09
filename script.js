let productCatalog = [];
let sortType = 'name';
let priceSortDirection = 'desc';
let nameSortDirection = 'asc';

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
    Math.abs((a.weightPerUnit || 0) - (b.weightPerUnit || 0)) < 0.001 &&
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
    updateResult();
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
    laborValue: document.getElementById('laborValue').value,
    laborType: document.getElementById('laborType').value,
    delivery: document.getElementById('delivery').value,
    packaging: document.getElementById('packaging').value
  };
  localStorage.setItem('markupData', JSON.stringify(data));
  updateResult();
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
  let unitPart = `${item.pack} ${item.unit}/${item.price.toFixed(2)} ₽`;
  if (item.unit === 'шт' && item.weightPerUnit) {
    unitPart += ` (${item.weightPerUnit} г/шт)`;
  }
  return `${item.name} (${unitPart}) — ${nutrition}`;
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
    sorted.sort((a, b) => b.price - a.price);
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
  const weightInput = item.unit === 'шт'
    ? `<input type="number" value="${item.weightPerUnit || ''}" min="0.1" step="0.1" data-field="weightPerUnit" placeholder="Вес 1 шт, г" style="width:90px;" required>`
    : '';

  formDiv.innerHTML = `
    <input type="text" value="${item.name}" data-field="name" style="width:120px;" placeholder="Название" required>
    <input type="number" value="${item.pack}" min="1" step="1" data-field="pack" style="width:80px;" placeholder="Упак." required>
    <select data-field="unit" style="width:90px;">
      <option value="шт" ${item.unit === 'шт' ? 'selected' : ''}>🥚 шт</option>
      <option value="мл" ${item.unit === 'мл' ? 'selected' : ''}>🥛 мл</option>
      <option value="гр" ${item.unit === 'гр' ? 'selected' : ''}>⚖️ гр</option>
    </select>
    ${weightInput}
    <input type="number" value="${item.price}" min="0" step="0.01" data-field="price" style="width:90px;" placeholder="Цена" required>
    
    <input type="number" value="${item.protein}" min="0" step="0.1" data-field="protein" placeholder="Белки" style="width:70px;">
    <input type="number" value="${item.fat}" min="0" step="0.1" data-field="fat" placeholder="Жиры" style="width:70px;">
    <input type="number" value="${item.carbs}" min="0" step="0.1" data-field="carbs" placeholder="Угл." style="width:70px;">
    <input type="number" value="${item.calories}" min="0" step="1" data-field="calories" placeholder="Ккал" style="width:70px;">
    
    <button type="button" class="save-edit-btn" data-index="${index}">✅</button>
    <button type="button" class="cancel-edit-btn" data-index="${index}">❌</button>
  `;
  productItem.innerHTML = '';
  productItem.appendChild(formDiv);

  // Динамическое появление поля веса при смене unit
  const unitSelect = formDiv.querySelector('[data-field="unit"]');
  const weightField = formDiv.querySelector('[data-field="weightPerUnit"]');
  if (unitSelect && !weightField) {
    unitSelect.addEventListener('change', () => {
      const weightInput = unitSelect.value === 'шт'
        ? `<input type="number" value="" min="0.1" step="0.1" data-field="weightPerUnit" placeholder="Вес 1 шт, г" style="width:90px;" required>`
        : '';
      const priceInput = formDiv.querySelector('[data-field="price"]');
      priceInput.insertAdjacentHTML('beforebegin', weightInput);
    });
  }
}

function saveEdit(index, btn) {
  const form = btn.closest('.edit-form');
  const name = form.querySelector('[data-field="name"]').value.trim();
  const pack = parseFloat(form.querySelector('[data-field="pack"]').value) || 1;
  const unit = form.querySelector('[data-field="unit"]').value;
  const price = parseFloat(form.querySelector('[data-field="price"]').value) || 0;

  let weightPerUnit = null;
  if (unit === 'шт') {
    const wInput = form.querySelector('[data-field="weightPerUnit"]');
    weightPerUnit = parseFloat(wInput?.value) || null;
    if (weightPerUnit <= 0 || isNaN(weightPerUnit)) {
      alert('Для единицы "шт" обязательно укажите вес одной штуки (в граммах)');
      return;
    }
  }

  const protein = parseFloat(form.querySelector('[data-field="protein"]')?.value) || 0;
  const fat = parseFloat(form.querySelector('[data-field="fat"]')?.value) || 0;
  const carbs = parseFloat(form.querySelector('[data-field="carbs"]')?.value) || 0;
  const calories = parseFloat(form.querySelector('[data-field="calories"]')?.value) || 0;

  if (!name) {
    alert('Название не может быть пустым');
    return;
  }

  const newProduct = { name, pack, unit, price, protein, fat, carbs, calories };
  if (weightPerUnit !== null) newProduct.weightPerUnit = weightPerUnit;

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
  const pack = parseFloat(document.getElementById('newProductPack').value) || 1;
  const unit = document.getElementById('newProductUnit').value;
  const price = parseFloat(document.getElementById('newProductPrice').value) || 0;

  let weightPerUnit = null;
  if (unit === 'шт') {
    weightPerUnit = parseFloat(document.getElementById('newWeightPerUnit')?.value) || null;
    if (weightPerUnit <= 0 || isNaN(weightPerUnit)) {
      alert('Для единицы "шт" обязательно укажите вес одной штуки (в граммах)');
      return;
    }
  }

  const protein = parseFloat(document.getElementById('newProtein').value) || 0;
  const fat = parseFloat(document.getElementById('newFat').value) || 0;
  const carbs = parseFloat(document.getElementById('newCarbs').value) || 0;
  const calories = parseFloat(document.getElementById('newCalories').value) || 0;

  if (!name) {
    alert('Введите название');
    return;
  }

  const newProduct = { name, pack, unit, price, protein, fat, carbs, calories };
  if (weightPerUnit !== null) newProduct.weightPerUnit = weightPerUnit;

  const exists = productCatalog.some(p => productsEqual(p, newProduct));

  if (exists) {
    alert('Такой продукт уже существует');
    return;
  }

  productCatalog.push(newProduct);
  saveCatalog();
  updateAllCalcSelects();

  // Сброс формы
  document.getElementById('newProductName').value = '';
  document.getElementById('newProductPack').value = '10';
  document.getElementById('newProductUnit').value = 'шт';
  document.getElementById('newProductPrice').value = '0';
  document.getElementById('newWeightPerUnit').value = '';
  document.getElementById('newProtein').value = '0';
  document.getElementById('newFat').value = '0';
  document.getElementById('newCarbs').value = '0';
  document.getElementById('newCalories').value = '0';
}

function getProductInfo(name) {
  return productCatalog.find(p => p.name === name) || { name, pack: 1, unit: 'шт', price: 0, protein: 0, fat: 0, carbs: 0, calories: 0, weightPerUnit: 50 };
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

function createQtyInput(unit, value = '1') {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.value = value;
  if (unit === 'мл') {
    input.step = '0.1';
    input.placeholder = 'мл';
  } else if (unit === 'гр') {
    input.step = '1';
    input.placeholder = 'гр';
  } else {
    input.step = '1';
    input.placeholder = 'шт';
  }
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
    const oldQtyInput = inputGroup.querySelector('input[type="number"]');
    const oldUnitLabel = inputGroup.querySelector('.unit-label');

    const selectedName = oldSelect.value;
    const newSelect = createProductSelect(selectedName);
    const unit = getProductInfo(selectedName).unit;
    const newQtyInput = createQtyInput(unit, oldQtyInput.value);
    const newUnitLabel = createUnitLabel(unit);

    newSelect.onchange = () => {
      const qtyInput = inputGroup.querySelector('input[type="number"]');
      const unitLabel = inputGroup.querySelector('.unit-label');
      const newUnit = getProductInfo(newSelect.value).unit;
      const newQty = createQtyInput(newUnit, qtyInput.value);
      const newUnitEl = createUnitLabel(newUnit);
      qtyInput.replaceWith(newQty);
      unitLabel.replaceWith(newUnitEl);
      updateResultAndSave();
    };

    oldSelect.replaceWith(newSelect);
    oldQtyInput.replaceWith(newQtyInput);
    oldUnitLabel.replaceWith(newUnitLabel);
  });
  updateResultAndSave();
}

function addCalcRow() {
  if (productCatalog.length === 0) {
    alert('Сначала добавьте ингредиенты во вкладке "Ингредиенты" 🥕');
    openTab('products');
    return;
  }
  addCalcRowWithData('', '1');
}

function addCalcRowWithData(productName = '', qty = '1') {
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

  const inputGroup = document.createElement('div');
  inputGroup.className = 'input-group';
  
  select.onchange = () => {
    const newUnit = getProductInfo(select.value).unit;
    const newQty = createQtyInput(newUnit, qtyInput.value);
    const newUnitEl = createUnitLabel(newUnit);
    qtyInput.replaceWith(newQty);
    unitLabel.replaceWith(newUnitEl);
    updateResultAndSave();
  };

  inputGroup.append(qtyInput, unitLabel, deleteBtn);
  div.append(select, inputGroup);
  container.appendChild(div);
  updateResultAndSave();
}

function clearAllRows() {
  if (document.querySelectorAll('#inputs .row').length === 0) return;
  confirmDelete('all', () => {
    document.getElementById('inputs').innerHTML = '';
    updateResultAndSave();
  });
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
    const qtyInput = row.querySelector('.input-group input[type="number"]');
    const productName = select.value;
    if (!productName || productName === '— Выберите ингредиент —') return;

    const product = getProductInfo(productName);
    const qty = parseFloat(qtyInput.value) || 0;
    const pricePerUnit = product.price / product.pack;
    const cost = qty * pricePerUnit;
    baseTotal += cost;

    // --- Расчёт реального веса ---
    let actualWeight = 0;
    if (product.unit === 'шт') {
      actualWeight = qty * (product.weightPerUnit || 0);
    } else {
      actualWeight = qty; // гр или мл
    }

    // --- Расчёт БЖУ ---
    const factor = actualWeight / 100;
    totalWeight += actualWeight;
    totalProtein += product.protein * factor;
    totalFat += product.fat * factor;
    totalCarbs += product.carbs * factor;
    totalCalories += product.calories * factor;

    if (detailed) {
      const protein = product.protein * factor;
      const fat = product.fat * factor;
      const carbs = product.carbs * factor;
      const calories = product.calories * factor;

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

function updateResultAndSave() {
  updateResult();
  saveCalcRows();
}

function saveCalcRows() {
  const rows = [];
  document.querySelectorAll('#inputs .row').forEach(row => {
    const select = row.querySelector('select');
    const qty = row.querySelector('.input-group input[type="number"]').value;
    if (select.value && select.value !== '— Выберите ингредиент —') {
      rows.push({ product: select.value, qty });
    }
  });
  localStorage.setItem('calcRows', JSON.stringify(rows));
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  // Обработчики вкладок
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      openTab(tabName);
    });
  });

  // Обработчики кнопок
  document.getElementById('addCalcRowBtn').addEventListener('click', addCalcRow);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllRows);
  document.getElementById('addProductBtn').addEventListener('click', addProductToList);
  document.getElementById('toggleNameSortBtn').addEventListener('click', toggleNameSort);
  document.getElementById('togglePriceSortBtn').addEventListener('click', togglePriceSort);
  document.getElementById('saveMarkupBtn').addEventListener('click', saveMarkup);

  // Делегирование событий
  document.getElementById('productListDisplay').addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-product-btn')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      editProduct(index);
    } else if (e.target.classList.contains('remove-product-btn')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      removeProduct(index);
    } else if (e.target.classList.contains('save-edit-btn')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      saveEdit(index, e.target);
    } else if (e.target.classList.contains('cancel-edit-btn')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      cancelEdit(index);
    }
  });

  document.getElementById('inputs').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-row-btn')) {
      e.target.closest('.row').remove();
      updateResultAndSave();
    }
  });

  // Обработчики изменений
  document.getElementById('result').addEventListener('change', (e) => {
    if (e.target.id === 'detailedMode') {
      updateResultAndSave();
    }
  });

  document.getElementById('inputs').addEventListener('input', (e) => {
    if (e.target.matches('input[type="number"]')) {
      updateResultAndSave();
    }
  });

  // Resize handler (с debounce)
  let resizeTimeout;
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(lastWidth - window.innerWidth) > 2) {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        lastWidth = window.innerWidth;
        updateAllCalcSelects();
      }, 200);
    }
  });

  // Динамическое поле веса в форме добавления
  const unitSelect = document.getElementById('newProductUnit');
  const basicSection = document.querySelector('.basic-info-section');
  const packUnitRow = document.querySelector('.pack-unit-row');

  function toggleWeightInput() {
    const isPiece = unitSelect.value === 'шт';
    let weightInput = document.getElementById('newWeightPerUnit');
    if (isPiece) {
      if (!weightInput) {
        weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.id = 'newWeightPerUnit';
        weightInput.min = '0.1';
        weightInput.step = '0.1';
        weightInput.placeholder = 'Вес 1 шт, г';
        weightInput.required = true;
        weightInput.style.width = '100%';
        weightInput.style.marginTop = '5px';
        weightInput.style.padding = '8px';
        weightInput.style.borderRadius = '8px';
        weightInput.style.border = '1px solid #d4a574';
        weightInput.style.background = '#fffaf0';
        const label = document.createElement('label');
        label.textContent = '⚖️ Вес одной штуки (г):';
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        label.style.fontWeight = '600';
        const wrapper = document.createElement('div');
        wrapper.className = 'form-field';
        wrapper.appendChild(label);
        wrapper.appendChild(weightInput);
        packUnitRow.after(wrapper);
      }
    } else {
      if (weightInput) weightInput.closest('.form-field').remove();
    }
  }

  unitSelect.addEventListener('change', toggleWeightInput);
  toggleWeightInput(); // init

  loadAllData();
});
