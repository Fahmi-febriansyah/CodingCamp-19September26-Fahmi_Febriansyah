/**
 * ============================================================
 * Expense & Budget Visualizer
 * Core Logic — Vanilla JavaScript (No frameworks)
 * 
 * Features:
 *  - MVP 1: Input Form with validation (Item Name, Amount, Category)
 *  - MVP 2: Scrollable Transaction List (Name, Amount, Category, Delete)
 *  - MVP 3: Real-time Total Balance Calculation
 *  - MVP 4: Dynamic Visual Pie Chart (Chart.js)
 *  - OPT 1: Add Custom Categories (persisted, distinct colors)
 *  - OPT 2: Monthly Summary View with month navigation
 *  - OPT 3: Sort & Filter (by Amount, Category, Date)
 *  - OPT 4: Highlight Spending Over Set Limit & Budget Progress Bar
 *  - OPT 5: Dark / Light Mode Toggle with chart synchronization
 * ============================================================
 */

(function () {
  'use strict';

  /* ============================================================
     1. CONSTANTS & KEYS
     ============================================================ */
  const STORAGE_KEYS = {
    TRANSACTIONS: 'ebv_transactions',
    CUSTOM_CATS: 'ebv_custom_categories',
    SPENDING_LIMIT: 'ebv_spending_limit',
    THEME: 'ebv_theme'
  };

  const BASE_CATEGORIES = ['Food', 'Transport', 'Fun'];

  const CATEGORY_COLORS = {
    Food: '#22c55e',       // Emerald Green
    Transport: '#3b82f6',  // Vivid Blue
    Fun: '#f59e0b'         // Warm Amber / Coral
  };

  const DYNAMIC_PALETTE = [
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
    '#10b981', '#6366f1', '#14b8a6', '#e11d48'
  ];

  // Default seed transactions matching Page 4 of assignment PDF
  const SEED_TRANSACTIONS = [
    {
      id: 'seed-1',
      name: 'Shopping',
      amount: 3.56,
      category: 'Fun',
      date: new Date().toISOString()
    },
    {
      id: 'seed-2',
      name: 'Cilok',
      amount: 14.94,
      category: 'Food',
      date: new Date().toISOString()
    }
  ];

  /* ============================================================
     2. APPLICATION STATE
     ============================================================ */
  let transactions = [];
  let customCategories = [];
  let spendingLimit = 0;
  let sortBy = 'date-desc';
  let filterCategory = 'all';
  let viewMonth = new Date();
  let chartInstance = null;

  /* ============================================================
     3. DOM ELEMENTS CACHE
     ============================================================ */
  const el = {};

  function cacheDom() {
    el.totalBalance = document.getElementById('totalBalance');
    el.limitAlert = document.getElementById('limitAlert');
    el.alertLimitValue = document.getElementById('alertLimitValue');
    
    // Budget
    el.spendingLimit = document.getElementById('spendingLimit');
    el.clearLimitBtn = document.getElementById('clearLimitBtn');
    el.budgetProgressWrapper = document.getElementById('budgetProgressWrapper');
    el.budgetProgressText = document.getElementById('budgetProgressText');
    el.budgetPercentText = document.getElementById('budgetPercentText');
    el.budgetProgressBar = document.getElementById('budgetProgressBar');

    // Form
    el.transactionForm = document.getElementById('transactionForm');
    el.itemName = document.getElementById('itemName');
    el.amount = document.getElementById('amount');
    el.category = document.getElementById('category');
    el.transactionDate = document.getElementById('transactionDate');
    el.nameError = document.getElementById('nameError');
    el.amountError = document.getElementById('amountError');
    el.categoryError = document.getElementById('categoryError');
    el.dateError = document.getElementById('dateError');

    // Custom Category Box
    el.customCategoryBox = document.getElementById('customCategoryBox');
    el.customCategoryInput = document.getElementById('customCategoryInput');
    el.saveCustomCatBtn = document.getElementById('saveCustomCatBtn');
    el.cancelCustomCatBtn = document.getElementById('cancelCustomCatBtn');
    el.customCategoryError = document.getElementById('customCategoryError');

    // Transactions List
    el.transactionList = document.getElementById('transactionList');
    el.transactionCount = document.getElementById('transactionCount');
    el.emptyMsg = document.getElementById('emptyMsg');
    el.sortBy = document.getElementById('sortBy');
    el.filterCategory = document.getElementById('filterCategory');

    // Chart
    el.spendingChart = document.getElementById('spendingChart');
    el.chartEmpty = document.getElementById('chartEmpty');

    // Monthly Summary
    el.prevMonth = document.getElementById('prevMonth');
    el.nextMonth = document.getElementById('nextMonth');
    el.currentMonthLabel = document.getElementById('currentMonthLabel');
    el.monthlySummaryContent = document.getElementById('monthlySummaryContent');

    // Theme Toggle
    el.themeToggle = document.getElementById('themeToggle');
    el.themeIcon = document.getElementById('themeIcon');
  }

  /* ============================================================
     4. DATA PERSISTENCE (LocalStorage API)
     ============================================================ */
  function loadData() {
    try {
      const storedTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (storedTx === null) {
        // First run: provide initial seed from PDF mockup
        transactions = [...SEED_TRANSACTIONS];
        saveTransactions();
      } else {
        transactions = JSON.parse(storedTx) || [];
      }
    } catch (e) {
      console.error('Error loading transactions:', e);
      transactions = [];
    }

    try {
      const storedCats = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATS);
      customCategories = storedCats ? JSON.parse(storedCats) : [];
      if (!Array.isArray(customCategories)) customCategories = [];
    } catch (e) {
      console.error('Error loading custom categories:', e);
      customCategories = [];
    }

    try {
      const storedLim = localStorage.getItem(STORAGE_KEYS.SPENDING_LIMIT);
      spendingLimit = storedLim ? parseFloat(storedLim) : 0;
      if (isNaN(spendingLimit) || spendingLimit < 0) spendingLimit = 0;
      if (el.spendingLimit && spendingLimit > 0) {
        el.spendingLimit.value = spendingLimit;
      }
    } catch (e) {
      spendingLimit = 0;
    }
  }

  function saveTransactions() {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  function saveCustomCategories() {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATS, JSON.stringify(customCategories));
  }

  function saveSpendingLimit() {
    localStorage.setItem(STORAGE_KEYS.SPENDING_LIMIT, spendingLimit.toString());
  }

  /* ============================================================
     5. UTILITY & FORMATTING FUNCTIONS
     ============================================================ */
  function formatCurrency(num) {
    const val = Number(num) || 0;
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getAllCategories() {
    return [...BASE_CATEGORIES, ...customCategories];
  }

  function getCategoryColor(category) {
    if (CATEGORY_COLORS[category]) {
      return CATEGORY_COLORS[category];
    }
    const idx = customCategories.indexOf(category);
    if (idx !== -1) {
      return DYNAMIC_PALETTE[idx % DYNAMIC_PALETTE.length];
    }
    return '#94a3b8';
  }

  function getBadgeClass(category) {
    const lower = String(category).toLowerCase();
    if (lower === 'food') return 'badge-food';
    if (lower === 'transport') return 'badge-transport';
    if (lower === 'fun') return 'badge-fun';
    return 'badge-custom';
  }

  /* ============================================================
     6. THEME TOGGLE (Optional Challenge)
     ============================================================ */
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (el.themeIcon) {
      el.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    if (el.themeToggle) {
      el.themeToggle.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    updateChartTheme();
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  /* ============================================================
     7. CATEGORY SELECT MANAGEMENT (Optional Challenge: Custom Categories)
     ============================================================ */
  function populateCategorySelects(selectedCategoryValue = '') {
    const allCats = getAllCategories();

    // 1. Transaction Form Category Select
    const currentCat = selectedCategoryValue || el.category.value;
    el.category.innerHTML = '<option value="">-- Select Category --</option>';

    allCats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      el.category.appendChild(opt);
    });

    const customOption = document.createElement('option');
    customOption.value = '__add_custom__';
    customOption.textContent = '+ Add Custom Category...';
    el.category.appendChild(customOption);

    if (currentCat && allCats.includes(currentCat)) {
      el.category.value = currentCat;
    }

    // 2. Filter Category Select
    const currentFilter = el.filterCategory.value;
    el.filterCategory.innerHTML = '<option value="all">All Categories</option>';
    allCats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      el.filterCategory.appendChild(opt);
    });

    if (currentFilter && (currentFilter === 'all' || allCats.includes(currentFilter))) {
      el.filterCategory.value = currentFilter;
    } else {
      el.filterCategory.value = 'all';
      filterCategory = 'all';
    }
  }

  function handleCategoryChange() {
    clearErrors();
    if (el.category.value === '__add_custom__') {
      showCustomCategoryBox();
    } else {
      hideCustomCategoryBox();
    }
  }

  function showCustomCategoryBox() {
    el.customCategoryBox.classList.remove('hidden');
    el.customCategoryInput.value = '';
    el.customCategoryError.textContent = '';
    el.customCategoryInput.focus();
  }

  function hideCustomCategoryBox() {
    el.customCategoryBox.classList.add('hidden');
    el.customCategoryError.textContent = '';
    el.customCategoryInput.value = '';
  }

  function saveCustomCategory() {
    const name = el.customCategoryInput.value.trim();
    el.customCategoryError.textContent = '';

    if (!name) {
      el.customCategoryError.textContent = 'Please enter a category name.';
      el.customCategoryInput.focus();
      return;
    }

    const all = getAllCategories();
    const isDuplicate = all.some(c => c.toLowerCase() === name.toLowerCase());

    if (isDuplicate) {
      el.customCategoryError.textContent = `Category "${name}" already exists.`;
      el.customCategoryInput.focus();
      return;
    }

    // Add and persist
    customCategories.push(name);
    saveCustomCategories();

    // Rebuild dropdowns and select the newly added category
    populateCategorySelects(name);
    hideCustomCategoryBox();
  }

  /* ============================================================
     8. FORM VALIDATION & SUBMISSION (MVP Requirement)
     ============================================================ */
  function clearErrors() {
    [el.nameError, el.amountError, el.categoryError, el.dateError, el.customCategoryError].forEach(errEl => {
      if (errEl) errEl.textContent = '';
    });
    [el.itemName, el.amount, el.category, el.transactionDate, el.customCategoryInput].forEach(inp => {
      if (inp) inp.classList.remove('input-error');
    });
  }

  function markError(inputElement, errorElement, message) {
    if (inputElement) inputElement.classList.add('input-error');
    if (errorElement) errorElement.textContent = message;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    clearErrors();

    const nameVal = el.itemName.value.trim();
    const amountVal = parseFloat(el.amount.value);
    const catVal = el.category.value;
    const dateVal = el.transactionDate.value;

    let hasError = false;

    // Validate Item Name
    if (!nameVal) {
      markError(el.itemName, el.nameError, 'Item name is required.');
      hasError = true;
    }

    // Validate Amount
    if (!el.amount.value.trim() || isNaN(amountVal) || amountVal <= 0) {
      markError(el.amount, el.amountError, 'Please enter a valid amount greater than $0.00.');
      hasError = true;
    }

    // Validate Category
    if (!catVal || catVal === '__add_custom__') {
      markError(el.category, el.categoryError, 'Please select a valid category.');
      hasError = true;
    }

    if (hasError) return;

    // Resolve date (defaults to current date if left blank)
    let finalDateIso;
    if (dateVal) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        finalDateIso = d.toISOString();
      } else {
        finalDateIso = new Date().toISOString();
      }
    } else {
      finalDateIso = new Date().toISOString();
    }

    // Create Transaction Object
    const newTransaction = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: nameVal,
      amount: Math.round(amountVal * 100) / 100,
      category: catVal,
      date: finalDateIso
    };

    // Add to beginning of array
    transactions.unshift(newTransaction);
    saveTransactions();

    // Reset Form Fields
    el.itemName.value = '';
    el.amount.value = '';
    el.category.value = '';
    setDefaultDate();
    hideCustomCategoryBox();

    // Update entire UI
    renderAll();
  }

  function setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (el.transactionDate) {
      el.transactionDate.value = `${yyyy}-${mm}-${dd}`;
    }
  }

  /* ============================================================
     9. DELETE TRANSACTION (MVP Requirement)
     ============================================================ */
  function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    renderAll();
  }

  /* ============================================================
     10. SORT & FILTER (Optional Challenge)
     ============================================================ */
  function getSortedAndFilteredTransactions() {
    let list = [...transactions];

    // 1. Filter
    if (filterCategory !== 'all') {
      list = list.filter(t => t.category === filterCategory);
    }

    // 2. Sort
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
      default:
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return list;
  }

  /* ============================================================
     11. RENDER: TOTAL BALANCE & SPENDING LIMIT (MVP & Optional Challenge)
     ============================================================ */
  function calculateTotalBalance() {
    const sum = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    return Math.round(sum * 100) / 100;
  }

  function renderBalanceAndBudget() {
    const total = calculateTotalBalance();
    el.totalBalance.textContent = formatCurrency(total);

    // Budget Progress & Over-limit Warning
    if (spendingLimit > 0) {
      el.budgetProgressWrapper.classList.remove('hidden');
      el.budgetProgressText.textContent = `Spent: ${formatCurrency(total)} of ${formatCurrency(spendingLimit)}`;

      const percentage = Math.round((total / spendingLimit) * 100);
      el.budgetPercentText.textContent = `${percentage}%`;

      const barWidth = Math.min(percentage, 100);
      el.budgetProgressBar.style.width = `${barWidth}%`;

      // Visual progress bar color stages
      el.budgetProgressBar.classList.remove('warning', 'danger');
      if (percentage >= 100) {
        el.budgetProgressBar.classList.add('danger');
      } else if (percentage >= 80) {
        el.budgetProgressBar.classList.add('warning');
      }

      // Alert banner if exceeded
      if (total > spendingLimit) {
        el.alertLimitValue.textContent = formatCurrency(spendingLimit);
        el.limitAlert.classList.remove('hidden');
      } else {
        el.limitAlert.classList.add('hidden');
      }
    } else {
      el.budgetProgressWrapper.classList.add('hidden');
      el.limitAlert.classList.add('hidden');
    }
  }

  function handleSpendingLimitChange() {
    const val = parseFloat(el.spendingLimit.value);
    spendingLimit = isNaN(val) || val <= 0 ? 0 : Math.round(val * 100) / 100;
    saveSpendingLimit();
    renderAll();
  }

  function clearSpendingLimit() {
    spendingLimit = 0;
    el.spendingLimit.value = '';
    saveSpendingLimit();
    renderAll();
  }

  /* ============================================================
     12. RENDER: TRANSACTION LIST (MVP Requirement)
     ============================================================ */
  function renderTransactions() {
    const list = getSortedAndFilteredTransactions();
    el.transactionCount.textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;

    // Remove all transaction item nodes while preserving emptyMsg
    const existingItems = el.transactionList.querySelectorAll('.transaction-item');
    existingItems.forEach(node => node.remove());

    if (list.length === 0) {
      el.emptyMsg.classList.remove('hidden');
      return;
    }
    el.emptyMsg.classList.add('hidden');

    list.forEach(item => {
      const isOverLimit = spendingLimit > 0 && item.amount > spendingLimit;
      const itemEl = document.createElement('div');
      itemEl.className = 'transaction-item' + (isOverLimit ? ' over-limit' : '');
      itemEl.setAttribute('data-id', item.id);

      itemEl.innerHTML = `
        <div class="item-left">
          <div class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
          <div class="item-amount">${formatCurrency(item.amount)}</div>
          <div class="item-meta">
            <span class="item-category ${getBadgeClass(item.category)}">${escapeHtml(item.category)}</span>
            <span class="item-date">${formatDate(item.date)}</span>
            ${isOverLimit ? '<span class="item-overlimit-tag" title="Exceeds single item budget limit">⚠️ Over Limit</span>' : ''}
          </div>
        </div>
        <button class="btn-delete" data-id="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">Delete</button>
      `;

      el.transactionList.appendChild(itemEl);
    });
  }

  /* ============================================================
     13. RENDER: PIE CHART (Chart.js — MVP Requirement)
     ============================================================ */
  function updateChartTheme() {
    if (!chartInstance) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const borderColor = isDark ? '#1e293b' : '#ffffff';

    if (chartInstance.options?.plugins?.legend?.labels) {
      chartInstance.options.plugins.legend.labels.color = textColor;
    }
    if (chartInstance.data?.datasets?.[0]) {
      chartInstance.data.datasets[0].borderColor = borderColor;
    }
    chartInstance.update();
  }

  function renderChart() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library is not yet loaded.');
      return;
    }

    // Aggregate spending per category across all transactions
    const categoryTotals = {};
    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
    });

    const labels = Object.keys(categoryTotals);
    const data = labels.map(cat => Math.round(categoryTotals[cat] * 100) / 100);

    // If no transactions, show empty state
    if (labels.length === 0) {
      el.spendingChart.style.display = 'none';
      el.chartEmpty.classList.remove('hidden');
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      return;
    }

    el.spendingChart.style.display = 'block';
    el.chartEmpty.classList.add('hidden');

    const backgroundColors = labels.map(cat => getCategoryColor(cat));
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const borderColor = isDark ? '#1e293b' : '#ffffff';

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = data;
      chartInstance.data.datasets[0].backgroundColor = backgroundColors;
      chartInstance.data.datasets[0].borderColor = borderColor;
      chartInstance.options.plugins.legend.labels.color = textColor;
      chartInstance.update();
    } else {
      chartInstance = new Chart(el.spendingChart, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors,
            borderColor: borderColor,
            borderWidth: 2,
            hoverOffset: 6
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
                boxWidth: 14,
                padding: 14,
                font: {
                  family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  size: 13,
                  weight: '500'
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const current = context.raw || 0;
                  const pct = total > 0 ? ((current / total) * 100).toFixed(1) : 0;
                  return ` ${context.label}: ${formatCurrency(current)} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  /* ============================================================
     14. RENDER: MONTHLY SUMMARY VIEW (Optional Challenge)
     ============================================================ */
  function renderMonthlySummary() {
    const yr = viewMonth.getFullYear();
    const mo = viewMonth.getMonth();

    const monthName = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    el.currentMonthLabel.textContent = monthName;

    // Filter transactions for viewMonth
    const monthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d.getFullYear() === yr && d.getMonth() === mo;
    });

    el.monthlySummaryContent.innerHTML = '';

    if (monthTx.length === 0) {
      el.monthlySummaryContent.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 20px 0;">
          <p>No transactions recorded in ${monthName}.</p>
          <span class="empty-sub">Add a transaction with this month's date to view summaries.</span>
        </div>
      `;
      return;
    }

    const catTotals = {};
    let monthTotal = 0;

    monthTx.forEach(t => {
      const amt = Number(t.amount) || 0;
      catTotals[t.category] = (catTotals[t.category] || 0) + amt;
      monthTotal += amt;
    });

    // Render individual category cards
    Object.entries(catTotals).forEach(([cat, amt]) => {
      const card = document.createElement('div');
      card.className = 'summary-card-item';
      card.innerHTML = `
        <span class="summary-cat-title">${escapeHtml(cat)}</span>
        <span class="summary-cat-amount">${formatCurrency(amt)}</span>
      `;
      el.monthlySummaryContent.appendChild(card);
    });

    // Render Grand Total card for month
    const totalCard = document.createElement('div');
    totalCard.className = 'summary-card-item summary-total-item';
    totalCard.innerHTML = `
      <span class="summary-cat-title">Total Spending (${monthName})</span>
      <span class="summary-cat-amount">${formatCurrency(monthTotal)}</span>
    `;
    el.monthlySummaryContent.appendChild(totalCard);
  }

  /* ============================================================
     15. RENDER ALL
     ============================================================ */
  function renderAll() {
    renderBalanceAndBudget();
    renderTransactions();
    renderChart();
    renderMonthlySummary();
  }

  /* ============================================================
     16. EVENT LISTENERS
     ============================================================ */
  function initEventListeners() {
    // 1. Form submit
    el.transactionForm.addEventListener('submit', handleFormSubmit);

    // 2. Real-time error clearance on typing
    el.itemName.addEventListener('input', () => {
      el.itemName.classList.remove('input-error');
      el.nameError.textContent = '';
    });
    el.amount.addEventListener('input', () => {
      el.amount.classList.remove('input-error');
      el.amountError.textContent = '';
    });
    el.category.addEventListener('change', () => {
      el.category.classList.remove('input-error');
      el.categoryError.textContent = '';
      handleCategoryChange();
    });

    // 3. Custom Category Buttons
    el.saveCustomCatBtn.addEventListener('click', saveCustomCategory);
    el.cancelCustomCatBtn.addEventListener('click', () => {
      hideCustomCategoryBox();
      el.category.value = '';
    });
    el.customCategoryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveCustomCategory();
      } else if (e.key === 'Escape') {
        hideCustomCategoryBox();
        el.category.value = '';
      }
    });

    // 4. Delete Transaction (Event Delegation)
    el.transactionList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        deleteTransaction(id);
      }
    });

    // 5. Sort & Filter Controls
    el.sortBy.addEventListener('change', (e) => {
      sortBy = e.target.value;
      renderTransactions();
    });
    el.filterCategory.addEventListener('change', (e) => {
      filterCategory = e.target.value;
      renderTransactions();
    });

    // 6. Spending Limit
    el.spendingLimit.addEventListener('change', handleSpendingLimitChange);
    el.spendingLimit.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') handleSpendingLimitChange();
    });
    el.clearLimitBtn.addEventListener('click', clearSpendingLimit);

    // 7. Monthly Summary Navigation
    el.prevMonth.addEventListener('click', () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
      renderMonthlySummary();
    });
    el.nextMonth.addEventListener('click', () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
      renderMonthlySummary();
    });

    // 8. Theme Toggle
    el.themeToggle.addEventListener('click', toggleTheme);
  }

  /* ============================================================
     17. APPLICATION INITIALIZATION
     ============================================================ */
  function init() {
    cacheDom();
    initTheme();
    loadData();
    populateCategorySelects();
    setDefaultDate();
    initEventListeners();
    renderAll();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
