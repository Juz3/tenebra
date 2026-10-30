/**
 * Tenebra options page - global default toggle + per-site override table.
 */
(function () {
  "use strict";

  const { SITE_MODE } = self.TenebraStorage;

  const els = {
    globalToggle: document.getElementById("global-toggle"),
    tableBody: document.getElementById("site-table-body"),
    emptyState: document.getElementById("empty-state"),
  };

  const MODE_LABEL = {
    [SITE_MODE.ALWAYS]: "Always dark",
    [SITE_MODE.NEVER]: "Never dark",
  };

  async function renderSiteTable() {
    const modes = await self.TenebraStorage.getAllSiteModes();
    const hostnames = Object.keys(modes).sort();

    els.tableBody.innerHTML = "";
    els.emptyState.hidden = hostnames.length > 0;

    for (const hostname of hostnames) {
      const row = document.createElement("tr");

      const hostCell = document.createElement("td");
      hostCell.textContent = hostname;

      const modeCell = document.createElement("td");
      modeCell.textContent = MODE_LABEL[modes[hostname]] || modes[hostname];

      const actionCell = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove";
      removeBtn.textContent = "Reset";
      removeBtn.addEventListener("click", async () => {
        await self.TenebraStorage.setSiteMode(hostname, SITE_MODE.DEFAULT);
        renderSiteTable();
      });
      actionCell.appendChild(removeBtn);

      row.append(hostCell, modeCell, actionCell);
      els.tableBody.appendChild(row);
    }
  }

  async function init() {
    els.globalToggle.checked = await self.TenebraStorage.getGlobalDefault();
    await renderSiteTable();
  }

  els.globalToggle.addEventListener("change", () => {
    self.TenebraStorage.setGlobalDefault(els.globalToggle.checked);
  });

  init();
})();
