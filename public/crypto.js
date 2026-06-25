const cryptoEls = {
  chip: document.getElementById("crypto-chip"),
  amount: document.getElementById("crypto-ada-amount"),
  value: document.getElementById("crypto-ada-value"),
  fallback: document.getElementById("fallback-crypto"),
  fallbackAmount: document.getElementById("fallback-crypto-amount"),
  fallbackValue: document.getElementById("fallback-crypto-value")
};

function formatAdaAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";

  return number.toLocaleString("da-DK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatFiatValue(value, currency) {
  const number = Number(value);
  if (!Number.isFinite(number)) return `-- ${currency || "DKK"}`;

  return `${number.toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${currency || "DKK"}`;
}

function setCryptoVisible(visible) {
  if (cryptoEls.chip) cryptoEls.chip.classList.toggle("hidden", !visible);
  if (cryptoEls.fallback) cryptoEls.fallback.classList.toggle("hidden", !visible);
}

async function updateAdaBalance() {
  try {
    const response = await fetch("/api/crypto/ada", {
      cache: "no-store"
    });

    const payload = await response.json();

    if (!payload.ok || !payload.data) {
      setCryptoVisible(false);
      return;
    }

    const { amount, value, quoteCurrency } = payload.data;
    const amountText = formatAdaAmount(amount);
    const valueText = formatFiatValue(value, quoteCurrency);

    if (cryptoEls.amount) cryptoEls.amount.textContent = amountText;
    if (cryptoEls.value) cryptoEls.value.textContent = valueText;
    if (cryptoEls.fallbackAmount) cryptoEls.fallbackAmount.textContent = `${amountText} ADA`;
    if (cryptoEls.fallbackValue) cryptoEls.fallbackValue.textContent = valueText;

    setCryptoVisible(true);
  } catch {
    setCryptoVisible(false);
  }
}

updateAdaBalance();
setInterval(updateAdaBalance, 5 * 60 * 1000);
