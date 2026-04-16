// Template-specific UI logic.

function templateApi(path) {
  return window.SHIP_API?.endpoints?.[path] || `/${path}`;
}

function getEditableChipTemplate() {
  try {
    return JSON.parse($('chipTemplateEditor').value || '{}');
  } catch {
    return { label: $('chipTemplateLabel').value || '', pins: {} };
  }
}

function getEditableBoardTemplate() {
  try {
    return JSON.parse($('boardTemplateEditor').value || '{}');
  } catch {
    return {
      label: $('boardTemplateLabel').value || '',
      chip_template: $('boardTemplateChipTemplate').value || '',
      rules: []
    };
  }
}

function writeChipTemplateToEditors(template) {
  const normalized = {
    label: template?.label || '',
    pins: template?.pins || {}
  };
  const keys = Object.keys(normalized.pins || {});
  if (!state.ui.chipPinOrder.length) {
    state.ui.chipPinOrder = [...keys];
  } else {
    keys.forEach((key) => {
      if (!state.ui.chipPinOrder.includes(key)) {
        state.ui.chipPinOrder.push(key);
      }
    });
    state.ui.chipPinOrder = state.ui.chipPinOrder.filter((key) => keys.includes(key));
  }
  $('chipTemplateLabel').value = normalized.label;
  $('chipTemplateEditor').value = pretty(normalized);
}

function writeBoardTemplateToEditors(template) {
  const normalized = {
    label: template?.label || '',
    chip_template: template?.chip_template || '',
    rules: Array.isArray(template?.rules) ? template.rules : []
  };
  $('boardTemplateLabel').value = normalized.label;
  $('boardTemplateChipTemplate').value = normalized.chip_template || '';
  $('boardTemplateEditor').value = pretty(normalized);
}

function renderChipPinsVisual() {
  const template = getEditableChipTemplate();
  const ordered = (state.ui.chipPinOrder.length ? state.ui.chipPinOrder : Object.keys(template.pins || {}))
    .filter((gpio) => template.pins && template.pins[gpio])
    .map((gpio) => [gpio, template.pins[gpio]]);
  $('chipPinsTable').innerHTML = ordered.map(([gpio, pin]) => (
    '<tr data-chip-row="' + gpio + '" class="' + (state.ui.lastAddedChipPin === String(gpio) ? 'fresh' : '') + '">' +
      '<td><input class="mono-input" data-chip-gpio="' + gpio + '" value="' + escapeHtml(gpio) + '"></td>' +
      '<td><input data-chip-capabilities="' + gpio + '" value="' + escapeHtml((pin.capabilities || []).join(', ')) + '">' +
        '<div class="caps">di, do, ai, ao, counter, pwm</div></td>' +
      '<td><div class="checkbox-row">' +
        '<label><input type="checkbox" data-chip-pullup="' + gpio + '" ' + (pin.internal_pullup ? 'checked' : '') + '>PU</label>' +
        '<label><input type="checkbox" data-chip-inputonly="' + gpio + '" ' + (pin.input_only ? 'checked' : '') + '>Input only</label>' +
        '<label><input type="checkbox" data-chip-strapping="' + gpio + '" ' + (pin.strapping ? 'checked' : '') + '>Strap</label>' +
        '<label><input type="checkbox" data-chip-forbidden="' + gpio + '" ' + (pin.forbidden ? 'checked' : '') + '>Forbidden</label>' +
      '</div></td>' +
      '<td><input data-chip-note="' + gpio + '" value="' + escapeHtml(pin.note || '') + '"></td>' +
      '<td><button data-remove-chip-pin="' + gpio + '">Remove</button></td>' +
    '</tr>'
  )).join('') || '<tr><td colspan="5">No pins in template</td></tr>';
  if (state.ui.lastAddedChipPin) {
    document.querySelector('[data-chip-row="' + state.ui.lastAddedChipPin + '"]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function renderBoardRulesVisual() {
  const template = getEditableBoardTemplate();
  const rules = Array.isArray(template.rules) ? template.rules : [];
  $('boardRulesTable').innerHTML = rules.map((rule, index) => (
    '<tr data-board-row="' + index + '" class="' + (state.ui.lastAddedBoardRule === index ? 'fresh' : '') + '">' +
      '<td><input class="mono-input" data-board-rule-id="' + index + '" value="' + escapeHtml(rule.id || '') + '"></td>' +
      '<td><input data-board-rule-feature="' + index + '" value="' + escapeHtml(rule.feature || '') + '"></td>' +
      '<td><select data-board-rule-class="' + index + '">' +
        '<option value="safe" ' + ((rule.class || '') === 'safe' ? 'selected' : '') + '>safe</option>' +
        '<option value="warning" ' + ((rule.class || '') === 'warning' ? 'selected' : '') + '>warning</option>' +
        '<option value="shared" ' + ((rule.class || '') === 'shared' ? 'selected' : '') + '>shared</option>' +
        '<option value="exclusive" ' + ((rule.class || '') === 'exclusive' ? 'selected' : '') + '>exclusive</option>' +
        '<option value="forbidden" ' + ((rule.class || '') === 'forbidden' ? 'selected' : '') + '>forbidden</option>' +
      '</select>' +
      '<div class="checkbox-row"><label><input type="checkbox" data-board-rule-always="' + index + '" ' + (rule.always_on ? 'checked' : '') + '>Always On</label></div></td>' +
      '<td><input data-board-rule-pins="' + index + '" value="' + escapeHtml((rule.pins || []).join(', ')) + '">' +
        '<div class="caps">Comma-separated GPIO list</div></td>' +
      '<td><input data-board-rule-owner="' + index + '" placeholder="owner" value="' + escapeHtml(rule.owner || '') + '">' +
        '<input data-board-rule-reason="' + index + '" placeholder="reason" value="' + escapeHtml(rule.reason || '') + '"></td>' +
      '<td><button data-remove-board-rule="' + index + '">Remove</button></td>' +
    '</tr>'
  )).join('') || '<tr><td colspan="6">No rules in template</td></tr>';
  if (state.ui.lastAddedBoardRule >= 0) {
    document.querySelector('[data-board-row="' + state.ui.lastAddedBoardRule + '"]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function syncChipVisualToJson() {
  const rows = [...document.querySelectorAll('#chipPinsTable tr')];
  const pins = {};
  const nextOrder = [];
  rows.forEach((row) => {
    const keyInput = row.querySelector('[data-chip-gpio]');
    if (!keyInput) return;
    const original = keyInput.dataset.chipGpio;
    const gpio = keyInput.value.trim();
    if (!gpio) return;
    nextOrder.push(gpio);
    pins[gpio] = {
      capabilities: normalizeCapabilities(row.querySelector('[data-chip-capabilities="' + original + '"]').value),
      internal_pullup: !!row.querySelector('[data-chip-pullup="' + original + '"]').checked,
      input_only: !!row.querySelector('[data-chip-inputonly="' + original + '"]').checked,
      strapping: !!row.querySelector('[data-chip-strapping="' + original + '"]').checked,
      forbidden: !!row.querySelector('[data-chip-forbidden="' + original + '"]').checked,
      note: row.querySelector('[data-chip-note="' + original + '"]').value.trim()
    };
  });
  state.ui.chipPinOrder = nextOrder;
  writeChipTemplateToEditors({ label: $('chipTemplateLabel').value.trim(), pins });
  renderChipPinsVisual();
}

function syncBoardVisualToJson() {
  const rows = [...document.querySelectorAll('#boardRulesTable tr')];
  const rules = [];
  rows.forEach((row, index) => {
    const idInput = row.querySelector('[data-board-rule-id]');
    if (!idInput) return;
    rules.push({
      id: idInput.value.trim(),
      feature: row.querySelector('[data-board-rule-feature="' + index + '"]').value.trim(),
      class: row.querySelector('[data-board-rule-class="' + index + '"]').value,
      owner: row.querySelector('[data-board-rule-owner="' + index + '"]').value.trim(),
      reason: row.querySelector('[data-board-rule-reason="' + index + '"]').value.trim(),
      always_on: !!row.querySelector('[data-board-rule-always="' + index + '"]').checked,
      pins: row.querySelector('[data-board-rule-pins="' + index + '"]').value
        .split(',')
        .map((value) => parseInt(value.trim(), 10))
        .filter((value) => !Number.isNaN(value))
    });
  });
  writeBoardTemplateToEditors({
    label: $('boardTemplateLabel').value.trim(),
    chip_template: $('boardTemplateChipTemplate').value,
    rules
  });
  renderBoardRulesVisual();
}

function selectedBoardTemplateChipId() {
  const boardId = $('activeBoardTemplate')?.value || state.runtime?.board_template || '';
  return state.templates?.board_templates?.[boardId]?.chip_template || '';
}

function renderTemplates() {
  if (!state.templates || !state.runtime) return;
  const chipTemplates = state.templates.chip_templates || {};
  const boardTemplates = state.templates.board_templates || {};
  const chipIds = Object.keys(chipTemplates);
  const boardIds = Object.keys(boardTemplates);
  $('activeChipTemplate').innerHTML = ['<option value="">Follow board template</option>']
    .concat(chipIds.map((id) => '<option value="' + id + '">' + id + ' - ' + (chipTemplates[id].label || id) + '</option>'))
    .join('');
  $('activeBoardTemplate').innerHTML = boardIds
    .map((id) => '<option value="' + id + '">' + id + ' - ' + (boardTemplates[id].label || id) + '</option>')
    .join('');
  $('chipTemplateSelect').innerHTML = chipIds
    .map((id) => '<option value="' + id + '">' + id + ' - ' + (chipTemplates[id].label || id) + '</option>')
    .join('');
  $('boardTemplateSelect').innerHTML = boardIds
    .map((id) => '<option value="' + id + '">' + id + ' - ' + (boardTemplates[id].label || id) + '</option>')
    .join('');
  $('boardTemplateChipTemplate').innerHTML = chipIds
    .map((id) => '<option value="' + id + '">' + id + ' - ' + (chipTemplates[id].label || id) + '</option>')
    .join('');
  $('templateBoardInstance').value = state.runtime.active_board || '';
  const runtimeBoardTemplate = state.runtime.board_template || state.templates.active_board_template || '';
  const runtimeChipTemplate = state.runtime.chip_template || state.templates.active_chip_template || '';
  if (runtimeBoardTemplate) $('activeBoardTemplate').value = runtimeBoardTemplate;
  $('activeChipTemplate').value = state.templates.active_chip_template || '';
  $('derivedChipTemplate').value = selectedBoardTemplateChipId() || '-';
  if (runtimeChipTemplate && chipIds.includes(runtimeChipTemplate)) {
    $('chipTemplateSelect').value = runtimeChipTemplate;
  } else if (chipIds.length) {
    $('chipTemplateSelect').value = chipIds[0];
  }
  if (runtimeBoardTemplate && boardIds.includes(runtimeBoardTemplate)) {
    $('boardTemplateSelect').value = runtimeBoardTemplate;
  } else if (boardIds.length) {
    $('boardTemplateSelect').value = boardIds[0];
  }
  loadSelectedTemplateIntoEditor('chip');
  loadSelectedTemplateIntoEditor('board');
  renderBoardTemplatePhysicalMap();
}

function loadSelectedTemplateIntoEditor(type) {
  const collection = type === 'chip'
    ? (state.templates?.chip_templates || {})
    : (state.templates?.board_templates || {});
  const selectId = type === 'chip' ? 'chipTemplateSelect' : 'boardTemplateSelect';
  const idField = type === 'chip' ? 'chipTemplateId' : 'boardTemplateId';
  const templateId = $(selectId).value;
  const template = collection[templateId] || {};
  $(idField).value = templateId || '';
  if (type === 'chip') {
    state.ui.lastAddedChipPin = '';
    state.ui.chipPinOrder = Object.keys(template.pins || {});
    writeChipTemplateToEditors(template);
    renderChipPinsVisual();
  } else {
    state.ui.lastAddedBoardRule = -1;
    writeBoardTemplateToEditors(template);
    renderBoardRulesVisual();
  }
}

function setTemplateTab(tab) {
  document.querySelectorAll('.template-tabs button')
    .forEach((btn) => btn.classList.toggle('active', btn.dataset.templateTab === tab));
  $('template-panel-chip').classList.toggle('hidden', tab !== 'chip');
  $('template-panel-board').classList.toggle('hidden', tab !== 'board');
}

function renderBoardTemplatePhysicalMap() {
  const target = $('boardPhysicalTable');
  if (!target) return;
  const rows = (state.hardware?.pins || [])
    .filter((pin) => pin.class !== 'exclusive')
    .map((pin) => (
      '<tr><td>GPIO' + pin.gpio + '</td><td><span class="badge ' + pin.class + '">' + pin.class + '</span></td>' +
      '<td>' + (pin.available ? 'yes' : 'no') + '</td><td>' + (pin.owner || '-') + '</td><td>' + (pin.reason || '-') + '</td></tr>'
    ))
    .join('');
  target.innerHTML = rows || '<tr><td colspan="5">No hardware map available</td></tr>';
}

async function refreshTemplatesAfterMutation() {
  if (typeof window.refreshTemplateSurface === 'function') {
    return window.refreshTemplateSurface();
  }
  if (typeof window.loadAll === 'function') {
    await window.loadAll();
    return true;
  }
  return false;
}

async function saveTemplateSelection() {
  $('templateSelectionStatus').textContent = 'Assigning templates to active board...';
  const payload = {
    active_chip_template: $('activeChipTemplate').value,
    active_board_template: $('activeBoardTemplate').value,
    active_board: state.runtime?.active_board || $('activeBoard').value
  };
  try {
    const response = await getJson(templateApi('templateSelection'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    await refreshTemplatesAfterMutation();
    $('templateSelectionStatus').textContent = response.message || 'Templates assigned';
  } catch (error) {
    $('templateSelectionStatus').textContent = 'Save failed: ' + error.message;
  }
}

async function saveTemplate(type, applyAfterSave = false) {
  const statusId = type === 'chip' ? 'chipTemplateStatus' : 'boardTemplateStatus';
  const idField = type === 'chip' ? 'chipTemplateId' : 'boardTemplateId';
  $(statusId).textContent = 'Saving template...';
  try {
    if (type === 'chip') syncChipVisualToJson();
    else syncBoardVisualToJson();
    const template = JSON.parse((type === 'chip' ? $('chipTemplateEditor').value : $('boardTemplateEditor').value) || '{}');
    const payload = { type, template_id: $(idField).value.trim(), template };
    if (!payload.template_id) throw new Error('Template ID is required');
    const response = await getJson(templateApi('templateLibrary'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    await refreshTemplatesAfterMutation();
    if (type === 'chip') $('chipTemplateSelect').value = payload.template_id;
    else $('boardTemplateSelect').value = payload.template_id;
    loadSelectedTemplateIntoEditor(type);
    if (applyAfterSave) {
      if (type === 'chip') {
        $('activeChipTemplate').value = payload.template_id;
      } else {
        $('activeBoardTemplate').value = payload.template_id;
        $('derivedChipTemplate').value = selectedBoardTemplateChipId() || '-';
        $('activeChipTemplate').value = '';
      }
      await saveTemplateSelection();
      $(statusId).textContent = 'Template saved and applied';
    } else {
      $(statusId).textContent = response.message || 'Template saved';
    }
  } catch (error) {
    $(statusId).textContent = 'Save failed: ' + error.message;
  }
}

async function deleteTemplate(type) {
  const selectId = type === 'chip' ? 'chipTemplateSelect' : 'boardTemplateSelect';
  const statusId = type === 'chip' ? 'chipTemplateStatus' : 'boardTemplateStatus';
  const templateId = $(selectId).value;
  if (!templateId) return;
  if (!confirm('Delete ' + type + ' template ' + templateId + '?')) return;
  $(statusId).textContent = 'Deleting template...';
  try {
    const response = await getJson(templateApi('templateDelete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, template_id: templateId })
    });
    await refreshTemplatesAfterMutation();
    $(statusId).textContent = response.message || 'Template deleted';
  } catch (error) {
    $(statusId).textContent = 'Delete failed: ' + error.message;
  }
}

async function seedChipTemplate() {
  $('chipTemplateStatus').textContent = 'Loading built-in seed...';
  try {
    const template = await getJson(templateApi('template'));
    writeChipTemplateToEditors({
      label: template.name || template.id,
      pins: Object.fromEntries((template.pins || []).map((pin) => [String(pin.gpio), {
        capabilities: pin.capabilities || [],
        internal_pullup: !!pin.internal_pullup,
        input_only: !!pin.input_only,
        strapping: !!pin.strapping,
        forbidden: !!pin.forbidden,
        note: pin.note || ''
      }]))
    });
    renderChipPinsVisual();
    if (!$('chipTemplateId').value) {
      $('chipTemplateId').value = (template.id || 'chip_template') + '_custom';
    }
    $('chipTemplateStatus').textContent = 'Built-in seed loaded';
  } catch (error) {
    $('chipTemplateStatus').textContent = 'Seed failed: ' + error.message;
  }
}

function newChipTemplate() {
  const base = getEditableChipTemplate();
  state.ui.lastAddedChipPin = '';
  state.ui.chipPinOrder = Object.keys(base.pins || {});
  writeChipTemplateToEditors({
    label: (base.label || 'Current Chip Template') + ' Copy',
    pins: base.pins || {}
  });
  renderChipPinsVisual();
  $('chipTemplateId').value = 'chip_template_custom';
  $('chipTemplateStatus').textContent = 'Started a new chip template from the current one';
}

function newBoardTemplate() {
  const base = getEditableBoardTemplate();
  const activeChip = $('derivedChipTemplate').value && $('derivedChipTemplate').value !== '-'
    ? $('derivedChipTemplate').value
    : ($('activeChipTemplate').value || '');
  writeBoardTemplateToEditors({
    label: (base.label || 'Current Board Template') + ' Copy',
    chip_template: base.chip_template || activeChip,
    rules: Array.isArray(base.rules) ? base.rules : []
  });
  renderBoardRulesVisual();
  $('boardTemplateId').value = 'board_template_custom';
  $('boardTemplateStatus').textContent = 'Started a new board template from the current one';
}

function addChipPin() {
  const template = getEditableChipTemplate();
  let gpio = 4;
  while (template.pins && template.pins[String(gpio)]) gpio += 1;
  template.pins = template.pins || {};
  template.pins[String(gpio)] = {
    capabilities: ['di'],
    internal_pullup: true,
    input_only: false,
    strapping: false,
    forbidden: false,
    note: ''
  };
  state.ui.lastAddedChipPin = String(gpio);
  state.ui.chipPinOrder = [...state.ui.chipPinOrder.filter((value) => value !== String(gpio)), String(gpio)];
  writeChipTemplateToEditors(template);
  renderChipPinsVisual();
  $('chipTemplateStatus').textContent = 'Added GPIO' + gpio + ' at the end of the chip template';
}

function removeChipPin(gpio) {
  const template = getEditableChipTemplate();
  if (template.pins) delete template.pins[gpio];
  state.ui.chipPinOrder = state.ui.chipPinOrder.filter((value) => value !== gpio);
  writeChipTemplateToEditors(template);
  renderChipPinsVisual();
  $('chipTemplateStatus').textContent = 'Pin removed';
}

function addBoardRule() {
  const template = getEditableBoardTemplate();
  template.rules = Array.isArray(template.rules) ? template.rules : [];
  template.rules.push({
    id: 'rule_' + (template.rules.length + 1),
    feature: '',
    class: 'warning',
    owner: '',
    reason: '',
    always_on: false,
    pins: []
  });
  state.ui.lastAddedBoardRule = template.rules.length - 1;
  writeBoardTemplateToEditors(template);
  renderBoardRulesVisual();
  $('boardTemplateStatus').textContent = 'Rule added at the end of the board template';
}

function removeBoardRule(index) {
  const template = getEditableBoardTemplate();
  template.rules = Array.isArray(template.rules) ? template.rules : [];
  template.rules.splice(index, 1);
  writeBoardTemplateToEditors(template);
  renderBoardRulesVisual();
  $('boardTemplateStatus').textContent = 'Rule removed';
}
