const GECKO_BASE_URL = "https://api.coingecko.com/api/v3";
let lastFetchedData = [];

/**
 * Fetch coin data from coinGecko
 *
 * See: https://www.coingecko.com/api/documentations/v3#/coins/get_coins_markets
 */
const getCoinsMarket = async (currency) => {
  const url = `${GECKO_BASE_URL}/coins/markets?vs_currency=${currency}&price_change_percentage=1h,24h,7d`;

  const response = await fetch(url);
  return response.json();
};

/**
 * Format currency with correct symbols and decimal places
 * For values >= 1, 2 decimals will be used
 * For values < 1, 5 decimals will be used
 */
const formatCurrency = (value, currency, showDecimal = true) => {
  const decimalDigits = !showDecimal ? 0 : value < 1 ? 5 : 2;

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  });
};

/**
 * Format input to a percentage string with a maximum number of decimals
 */
const formatPercentage = (value, percision = 2) =>
  `${Math.round(value * 10 ** percision) / 10 ** percision}%`;

/**
 * Remove all rows
 */
const clearRows = ($table) => {
  $table.find("tbody tr").remove();
};

/**
 * Outputs positive or negative classname based on the provided value
 */
const getColorClass = (value) => {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "";
};

/**
 * Update the header with correct sorting state
 */
const updateHeader = ($table) => {
  const currentSortBy = $table.data("sort-by");
  const currentSort = $table.data("sort");

  $table.find("thead th").each((index, cell) => {
    const $cell = $(cell);

    if ($cell.data("sort-column") === currentSortBy) {
      $cell.addClass("active");

      if (currentSort === "desc") {
        $cell.find("[data-sort-icon")
          .html(` <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-caret-down-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
      </svg>`);
      } else {
        $cell.find("[data-sort-icon")
          .html(` <svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-caret-up-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.247 4.86l-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/>
      </svg>`);
      }
    } else {
      $cell.removeClass("active");
      $cell.find("[data-sort-icon").html("");
    }
  });
};

/**
 * Add rows to the table
 */
const renderRows = ($table, data) => {
  const currency = $table.data("currency");

  data.forEach((coin) => {
    $table.find("tbody").append(`
    <tr>
      <th scope="row">${coin.market_cap_rank}</th>
      <td><div class="coin-info d-flex align-items-center"><img src=${
        coin.image
      } alt="${coin.name}"><span class="flex-grow-1">${
      coin.name
    }</span><span class="badge badge-light coin-symbol">${
      coin.symbol
    }</span></div></td>
      <td>${formatCurrency(coin.current_price, currency)}</td>
      <td class="${getColorClass(
        coin.price_change_percentage_1h_in_currency,
      )}">${formatPercentage(coin.price_change_percentage_1h_in_currency)}</td>
      <td class="${getColorClass(
        coin.price_change_percentage_24h_in_currency,
      )}">${formatPercentage(coin.price_change_percentage_24h_in_currency)}</td>
      <td class="${getColorClass(
        coin.price_change_percentage_7d_in_currency,
      )}">${formatPercentage(coin.price_change_percentage_7d_in_currency)}</td>
      <td>${formatCurrency(coin.total_volume, currency, false)}</td>
      <td>${formatCurrency(coin.market_cap, currency, false)}</td>
    </tr>
    `);
  });
};

/**
 * Applies filter and sorting on the data and rerenders the table
 */
const renderTable = (data) => {
  const $table = $("[data-mc-table]");

  const sortBy = $table.data("sort-by");
  const sort = $table.data("sort");
  const search = $table.data("search");

  const sortedData = data.sort(sortByColumn(sortBy, sort));
  const filteredData = sortedData.filter(filterBySearch(search));

  clearRows($table);
  renderRows($table, filteredData);
  updateHeader($table);
};

/**
 * Returns a function that sorts the coins by the provided field(sortBy) in direction(sort)
 * Note: It can (only) handle numbers and strings types
 */
const sortByColumn = (sortBy, sort) => (a, b) => {
  if (typeof a[sortBy] === "string") {
    return sort === "asc"
      ? a[sortBy].localeCompare(b[sortBy])
      : b[sortBy].localeCompare(a[sortBy]);
  }

  return sort === "asc" ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
};

/**
 * Returns a function that filters the coin name and coin token with the provided search query
 */
const filterBySearch = (search) => (coin) =>
  coin.name.toLowerCase().includes(search.toLowerCase()) ||
  coin.symbol.toLowerCase().includes(search.toLowerCase());

/**
 * Fetch new data from the api and rerender the table
 */
const fetchAndRenderTable = async () => {
  const $table = $("[data-mc-table]");
  const $overlay = $(".overlay");

  const currency = $table.data("currency");

  $overlay.show();
  const data = await getCoinsMarket(currency);
  $overlay.hide();

  lastFetchedData = data;

  renderTable(data);
};

/**
 * Update the search and rerender the table
 */
const updateSearch = (value) => {
  const $table = $("[data-mc-table]");
  $table.data("search", value);

  renderTable(lastFetchedData);
};

/**
 * Update the currency, fetch the data again and rerender the table
 * Note: this update requires a re-fetch since the data from the api depends on the selected currency
 */
const updateCurrency = (currency) => {
  const $table = $("[data-mc-table]");
  const $dropdown = $("#dropdownMenuButton");

  $table.data("currency", currency);
  $dropdown.text(currency);

  fetchAndRenderTable();
};

/**
 * Update the sort and sort direction of the table and rerender the table
 * The sort direction will be flipped when the table is already sorted by the provided field
 */
const updateSort = (newSortBy, defaultSort) => {
  const $table = $("[data-mc-table]");

  const currentSortBy = $table.data("sort-by");
  const currentSort = $table.data("sort");
  const newOrderBy =
    currentSortBy === newSortBy
      ? currentSort === "desc"
        ? "asc"
        : "desc"
      : defaultSort;

  $table.data("sort-by", newSortBy);
  $table.data("sort", newOrderBy);

  renderTable(lastFetchedData);
};

// Add event listeners
$("#search").on("input", (event) => updateSearch(event.currentTarget.value));
$("#reset-search").click(() => updateSearch(""));
$("[data-sort-column]").click((event) => {
  const $column = $(event.currentTarget);
  const newSortBy = $column.data("sort-column");
  const defaultSort = $column.data("default-sort");

  updateSort(newSortBy, defaultSort);
});
$("[data-set-currency]").click((event) =>
  updateCurrency(event.currentTarget.dataset.setCurrency),
);

// Do initial fetch request
fetchAndRenderTable();
