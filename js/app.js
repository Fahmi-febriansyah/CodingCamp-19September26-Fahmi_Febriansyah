let transactions = [];
let customCategories = [];
let spendingLimit = 0;
let sortBy = 'date-desc';
let filterCategory = 'all';
let viewMonth = new Date();
let chart = null;

const defaultCategories = ['Food', 'Transport', 'Fun'];

const categoryColors = {
  Food: '#28a745',
  Transport: '#007bff',
  Fun: '#fd7e14'
};

const extraColors = ['#6f42c1', '#e83e8c', '#20c997', '#ffc107', '#17a2b8', '#6610f2'];

function loadData() {
  const savedTx = localStorage.getItem('transactions');
  if (savedTx) {
    try {
      transactions = JSON.parse(savedTx);
    } catch (e) {
      transactions = [];
    }
  } else {
    transactions = [
      { id: '1', name: 'Shopping', amount: 3.56, category: 'Fun', date: new Date().toISOString() },
      { id: '2', name: 'Cilok', amount: 14.94, category: 'Food', date: new Date().toISOString() }
    ];
    saveData();
  }

  const savedCats = localStorage.getItem('customCategories');
  if (savedCats) {
    try {
      customCategories = JSON.parse(savedCats);
    } catch (e) {
      customCategories = [];
    }
  }

  const savedLimit = localStorage.getItem('spendingLimit');
  if (savedLimit) {
    spendingLimit = parseFloat(savedLimit) || 0;
    const limitInput = document.getElementById('spendingLimit');
    if (limitInput && spendingLimit > 0) {
      limitInput.value = spendingLimit;
    }
  }

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeBtn').textContent = 'Light Mode';
  }
}

function saveData() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
  localStorage.setItem('customCategories', JSON.stringify(customCategories));
  localStorage.setItem('spendingLimit', spendingLimit.toString());
}

function formatMoney(amount) {
  return '$' + Number(amount).toFixed(2);
}

function getCategories() {
  return [...defaultCategories, ...customCategories];
}

function getColor(category) {
  if (categoryColors[category]) return categoryColors[category];
  const idx = customCategories.indexOf(category);
  return extraColors[idx % extraColors.length] || '#6c757d';
}

function updateCategoryDropdowns() {
  const catSelect = document.getElementById('category');
  const filterSelect = document.getElementById('filterCategory');
  const cats = getCategories();

  const prevCat = catSelect.value;
  catSelect.innerHTML = '<option value="">Select Category</option>';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catSelect.appendChild(opt);
  });
  const newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.textContent = '+ Add New Category';
  catSelect.appendChild(newOpt);

  if (prevCat && cats.includes(prevCat)) {
    catSelect.value = prevCat;
  }

  const prevFilter = filterSelect.value;
  filterSelect.innerHTML = '<option value="all">All</option>';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    filterSelect.appendChild(opt);
  });
  if (prevFilter && (prevFilter === 'all' || cats.includes(prevFilter))) {
    filterSelect.value = prevFilter;
  }
}

function render() {
  renderBalance();
  renderTransactions();
  renderChart();
  renderMonthlySummary();
}

function renderBalance() {
  const total = transactions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  document.getElementById('totalBalance').textContent = formatMoney(total);

  const banner = document.getElementById('limitBanner');
  if (spendingLimit > 0 && total > spendingLimit) {
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

function getSortedTransactions() {
  let list = [...transactions];

  if (filterCategory !== 'all') {
    list = list.filter(item => item.category === filterCategory);
  }

  switch (sortBy) {
    case 'date-desc':
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-asc':
      list.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'amount-desc':
      list.sort((a, b) => b.amount - a.amount);
      break;
    case 'amount-asc':
      list.sort((a, b) => a.amount - b.amount);
      break;
    case 'category-asc':
      list.sort((a, b) => a.category.localeCompare(b.category));
      break;
  }

  return list;
}

function renderTransactions() {
  const listEl = document.getElementById('transactionList');
  const emptyEl = document.getElementById('emptyTx');
  const items = getSortedTransactions();

  listEl.querySelectorAll('.tx-item').forEach(el => el.remove());

  if (items.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  items.forEach(item => {
    const isOver = spendingLimit > 0 && item.amount > spendingLimit;
    const div = document.createElement('div');
    div.className = 'tx-item' + (isOver ? ' over-limit' : '');

    div.innerHTML = `
      <div class="tx-info">
        <div class="tx-name">${item.name}</div>
        <div class="tx-amount">${formatMoney(item.amount)}</div>
        <div class="tx-category">${item.category}${isOver ? '<span class="limit-tag">Over Limit</span>' : ''}</div>
      </div>
      <button type="button" class="btn-delete" data-id="${item.id}">Delete</button>
    `;

    listEl.appendChild(div);
  });
}

function renderChart() {
  const canvas = document.getElementById('categoryChart');
  const emptyEl = document.getElementById('emptyChart');

  const totals = {};
  transactions.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
  });

  const labels = Object.keys(totals);
  const data = Object.values(totals);

  if (labels.length === 0) {
    canvas.style.display = 'none';
    emptyEl.style.display = 'block';
    if (chart) {
      chart.destroy();
      chart = null;
    }
    return;
  }

  canvas.style.display = 'block';
  emptyEl.style.display = 'none';

  const colors = labels.map(c => getColor(c));
  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#e6e8eb' : '#333333';
  const borderColor = isDark ? '#24292f' : '#ffffff';

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.data.datasets[0].borderColor = borderColor;
    chart.options.plugins.legend.labels.color = textColor;
    chart.update();
  } else {
    chart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: borderColor,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              padding: 12
            }
          }
        }
      }
    });
  }
}

function renderMonthlySummary() {
  const labelEl = document.getElementById('monthTitle');
  const gridEl = document.getElementById('monthlyBreakdown');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[viewMonth.getMonth()] + ' ' + viewMonth.getFullYear();
  labelEl.textContent = monthName;

  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();

  const monthItems = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });

  gridEl.innerHTML = '';

  if (monthItems.length === 0) {
    gridEl.innerHTML = '<p class="empty-text" style="grid-column: 1 / -1;">No spending in this month.</p>';
    return;
  }

  const totals = {};
  let grandTotal = 0;
  monthItems.forEach(item => {
    const amt = Number(item.amount) || 0;
    totals[item.category] = (totals[item.category] || 0) + amt;
    grandTotal += amt;
  });

  Object.entries(totals).forEach(([cat, val]) => {
    const box = document.createElement('div');
    box.className = 'breakdown-item';
    box.innerHTML = `
      <div class="breakdown-cat">${cat}</div>
      <div class="breakdown-val">${formatMoney(val)}</div>
    `;
    gridEl.appendChild(box);
  });

  const totalBox = document.createElement('div');
  totalBox.className = 'breakdown-item breakdown-total';
  totalBox.innerHTML = `
    <div class="breakdown-cat">Total</div>
    <div class="breakdown-val">${formatMoney(grandTotal)}</div>
  `;
  gridEl.appendChild(totalBox);
}

function addTransaction(e) {
  e.preventDefault();

  const nameInput = document.getElementById('itemName');
  const amountInput = document.getElementById('amount');
  const catInput = document.getElementById('category');

  const nameError = document.getElementById('nameError');
  const amountError = document.getElementById('amountError');
  const catError = document.getElementById('categoryError');

  nameError.textContent = '';
  amountError.textContent = '';
  catError.textContent = '';
  nameInput.classList.remove('has-error');
  amountInput.classList.remove('has-error');
  catInput.classList.remove('has-error');

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = catInput.value;

  let isValid = true;

  if (!name) {
    nameError.textContent = 'Please enter item name.';
    nameInput.classList.add('has-error');
    isValid = false;
  }

  if (!amountInput.value.trim() || isNaN(amount) || amount <= 0) {
    amountError.textContent = 'Please enter a valid amount.';
    amountInput.classList.add('has-error');
    isValid = false;
  }

  if (!category || category === '__new__') {
    catError.textContent = 'Please select a category.';
    catInput.classList.add('has-error');
    isValid = false;
  }

  if (!isValid) return;

  const newItem = {
    id: Date.now().toString(),
    name: name,
    amount: amount,
    category: category,
    date: new Date().toISOString()
  };

  transactions.unshift(newItem);
  saveData();

  nameInput.value = '';
  amountInput.value = '';
  catInput.value = '';

  render();
}

function deleteTransaction(id) {
  transactions = transactions.filter(item => item.id !== id);
  saveData();
  render();
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  document.getElementById('themeBtn').textContent = isDark ? 'Light Mode' : 'Dark Mode';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  if (chart) {
    const textColor = isDark ? '#e6e8eb' : '#333333';
    const borderColor = isDark ? '#24292f' : '#ffffff';
    chart.options.plugins.legend.labels.color = textColor;
    chart.data.datasets[0].borderColor = borderColor;
    chart.update();
  }
}

function setupEvents() {
  document.getElementById('transactionForm').addEventListener('submit', addTransaction);

  document.getElementById('transactionList').addEventListener('click', e => {
    if (e.target.classList.contains('btn-delete')) {
      const id = e.target.getAttribute('data-id');
      deleteTransaction(id);
    }
  });

  const catSelect = document.getElementById('category');
  const customRow = document.getElementById('customCatRow');
  const customInput = document.getElementById('customCatInput');
  const customError = document.getElementById('customCatError');

  catSelect.addEventListener('change', () => {
    if (catSelect.value === '__new__') {
      customRow.style.display = 'block';
      customInput.value = '';
      customError.textContent = '';
      customInput.focus();
    } else {
      customRow.style.display = 'none';
    }
  });

  document.getElementById('saveCatBtn').addEventListener('click', () => {
    const val = customInput.value.trim();
    if (!val) {
      customError.textContent = 'Category name cannot be empty.';
      return;
    }
    const all = getCategories();
    if (all.some(c => c.toLowerCase() === val.toLowerCase())) {
      customError.textContent = 'Category already exists.';
      return;
    }
    customCategories.push(val);
    saveData();
    updateCategoryDropdowns();
    catSelect.value = val;
    customRow.style.display = 'none';
  });

  document.getElementById('cancelCatBtn').addEventListener('click', () => {
    customRow.style.display = 'none';
    catSelect.value = '';
  });

  document.getElementById('sortBy').addEventListener('change', e => {
    sortBy = e.target.value;
    renderTransactions();
  });

  document.getElementById('filterCategory').addEventListener('change', e => {
    filterCategory = e.target.value;
    renderTransactions();
  });

  document.getElementById('spendingLimit').addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    spendingLimit = isNaN(val) || val <= 0 ? 0 : val;
    saveData();
    renderBalance();
    renderTransactions();
  });

  document.getElementById('prevMonth').addEventListener('click', () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    renderMonthlySummary();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    renderMonthlySummary();
  });

  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
}

function init() {
  loadData();
  updateCategoryDropdowns();
  setupEvents();
  render();
}

document.addEventListener('DOMContentLoaded', init);
