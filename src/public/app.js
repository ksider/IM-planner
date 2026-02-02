(() => {
  const root = (window.IMPlanner = window.IMPlanner || {});

  const normalizeText = (value) => String(value ?? "").trim();

  const initTagSelect = (container) => {
    if (!container || container.dataset.tagSelectInit) return;
    container.dataset.tagSelectInit = "1";
    const selectedEl = container.querySelector("[data-tag-selected]");
    const panelEl = container.querySelector("[data-tag-panel]");
    const filterInput = container.querySelector("[data-tag-filter]");
    if (!selectedEl || !panelEl) return;

    const getInputRoot = () =>
      panelEl.parentElement === document.body ? panelEl : container;

    const updateSelected = () => {
      const selectedTags = Array.from(
        getInputRoot().querySelectorAll('input[type="checkbox"][data-tag-value]')
      )
        .filter((input) => input.checked)
        .map((input) => input.dataset.tagValue || "");
      selectedEl.innerHTML = "";
      if (selectedTags.length === 0) {
        const placeholder = document.createElement("span");
        placeholder.className = "tag-placeholder";
        placeholder.textContent = "Select...";
        selectedEl.appendChild(placeholder);
        return;
      }
      selectedTags.forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.textContent = tag;
        selectedEl.appendChild(chip);
      });
    };

    const applyFilter = () => {
      if (!filterInput) return;
      const term = normalizeText(filterInput.value).toLowerCase();
      const options = Array.from(container.querySelectorAll("[data-tag-option]"));
      options.forEach((option) => {
        const text = normalizeText(option.dataset.tagLabel || option.textContent).toLowerCase();
        option.style.display = !term || text.includes(term) ? "" : "none";
      });
    };

    const ensureContainerId = () => {
      if (!container.id) {
        container.id = `tag-select-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
    };

    const positionPanel = () => {
      const rect = selectedEl.getBoundingClientRect();
      const top = rect.bottom + 6;
      const left = rect.left;
      panelEl.style.top = `${top}px`;
      panelEl.style.left = `${left}px`;
      panelEl.style.minWidth = `${Math.max(rect.width, 220)}px`;
    };

    const attachPanelToBody = () => {
      ensureContainerId();
      if (panelEl.parentElement !== document.body) {
        panelEl.dataset.tagOrigin = container.id;
        document.body.appendChild(panelEl);
      }
      panelEl.classList.add("is-portal");
      positionPanel();
    };

    const detachPanelFromBody = () => {
      if (panelEl.parentElement !== document.body) return;
      const originId = panelEl.dataset.tagOrigin;
      const origin = originId ? document.getElementById(originId) : null;
      if (origin) {
        origin.appendChild(panelEl);
      }
      panelEl.classList.remove("is-portal");
      panelEl.style.top = "";
      panelEl.style.left = "";
      panelEl.style.minWidth = "";
    };

    let repositionHandler = null;

    const closeSelect = () => {
      container.classList.remove("is-open");
      if (repositionHandler) {
        window.removeEventListener("scroll", repositionHandler, true);
        window.removeEventListener("resize", repositionHandler);
        repositionHandler = null;
      }
      panelEl.style.display = "none";
      updateSelected();
      detachPanelFromBody();
    };

    selectedEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      document.querySelectorAll("[data-tag-select].is-open").forEach((el) => {
        if (el !== container) {
          el.classList.remove("is-open");
          const panel = el.querySelector("[data-tag-panel]");
          if (panel) {
            panel.style.display = "none";
            panel.classList.remove("is-portal");
            if (panel.parentElement === document.body) {
              const originId = panel.dataset.tagOrigin;
              const origin = originId ? document.getElementById(originId) : null;
              if (origin) origin.appendChild(panel);
            }
          }
        }
      });
      if (!container.classList.contains("is-open")) {
        container.classList.add("is-open");
        attachPanelToBody();
        panelEl.style.display = "block";
        repositionHandler = () => {
          if (container.classList.contains("is-open")) positionPanel();
        };
        window.addEventListener("scroll", repositionHandler, true);
        window.addEventListener("resize", repositionHandler);
        updateSelected();
        if (filterInput) {
          filterInput.focus();
          filterInput.select();
        }
      } else {
        closeSelect();
      }
    });

    panelEl.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    const handleTagChange = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.dataset.tagValue) return;
      updateSelected();
    };
    container.addEventListener("change", handleTagChange);
    panelEl.addEventListener("change", handleTagChange);

    filterInput?.addEventListener("input", applyFilter);
    container._tagUpdate = updateSelected;
    container._tagClose = closeSelect;
    container._tagPanel = panelEl;
    updateSelected();
  };

  const initTagSelects = (rootEl = document) => {
    rootEl.querySelectorAll("[data-tag-select]").forEach((el) => initTagSelect(el));
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      document.querySelectorAll("[data-tag-select].is-open").forEach((el) => {
        const panel = el._tagPanel || el.querySelector("[data-tag-panel]");
        const inside =
          (target instanceof Node && el.contains(target)) ||
          (target instanceof Node && panel && panel.contains(target));
        if (inside) return;
        if (typeof el._tagClose === "function") {
          el._tagClose();
        } else {
          el.classList.remove("is-open");
        }
      });
    },
    true
  );
  document.addEventListener("DOMContentLoaded", () => initTagSelects());
  root.initTagSelects = initTagSelects;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches && node.matches("[data-tag-select]")) {
          initTagSelect(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll("[data-tag-select]").forEach((el) => initTagSelect(el));
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

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
