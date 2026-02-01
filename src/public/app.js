(() => {
  const root = (window.IMPlanner = window.IMPlanner || {});

  const normalizeText = (value) => String(value ?? "").trim();

  root.createCustomFieldManager = ({
    listEl,
    onChange,
    rowClass = "setup-field-row"
  }) => {
    if (!listEl) return null;

    const notifyChange = () => {
      if (typeof onChange === "function") onChange();
    };

    const buildRow = (data = {}) => {
      const row = document.createElement("div");
      row.className = rowClass;
      row.dataset.customField = "1";
      row.dataset.fieldId = data.id || `custom_${Date.now()}`;
      row.innerHTML = `
        <input type="text" data-custom-label value="${normalizeText(data.label)}" placeholder="Label">
        <input type="text" data-custom-unit value="${normalizeText(data.unit)}" placeholder="Unit">
        <input type="number" step="any" data-custom-value value="${normalizeText(data.value)}" placeholder="Value">
        <button class="icon-button danger" type="button" data-remove-field title="Remove">
          <span class="material-symbols-rounded" aria-hidden="true">delete</span>
        </button>
        <input type="hidden" data-custom-code value="${normalizeText(data.code)}">
      `;
      return row;
    };

    const addRow = (data = {}) => {
      const row = buildRow(data);
      listEl.appendChild(row);
      notifyChange();
      return row;
    };

    const addFromLibrary = (option) => {
      if (!option) return;
      const code = normalizeText(option.dataset.code);
      const label = normalizeText(option.dataset.label || option.textContent);
      const unit = normalizeText(option.dataset.unit);
      if (!label) return;
      const existing = Array.from(listEl.querySelectorAll('[data-custom-code]')).some(
        (input) => normalizeText(input.value) === code && code
      );
      if (existing) return;
      addRow({ code, label, unit });
    };

    const collect = () => {
      const rows = Array.from(listEl.querySelectorAll("[data-custom-field]"));
      return rows
        .map((row) => ({
          id: row.dataset.fieldId || "",
          code: normalizeText(row.querySelector("[data-custom-code]")?.value),
          label: normalizeText(row.querySelector("[data-custom-label]")?.value),
          unit: normalizeText(row.querySelector("[data-custom-unit]")?.value),
          value: row.querySelector("[data-custom-value]")?.value ?? ""
        }))
        .filter((row) => row.id && row.label);
    };

    listEl.addEventListener("input", () => notifyChange());
    listEl.addEventListener("click", (event) => {
      const removeBtn = event.target.closest("[data-remove-field]");
      if (!removeBtn) return;
      removeBtn.closest("[data-custom-field]")?.remove();
      notifyChange();
    });

    return { addRow, addFromLibrary, collect };
  };
})();
