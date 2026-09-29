
const OWNER_EMAIL = 'lunaquilling@gmail.com';
const SPREADSHEET_NAME = 'Luna Quilling — Enquiry Centre';
const SHEET_NAME = 'Enquiries';
const DASHBOARD_NAME = 'Dashboard';
const FOLDER_NAME = 'Luna Quilling - Customer References';
const WORK_FOLDER_NAME = 'Luna Quilling - Website Work';
const WORK_SHEET_NAME = 'Work Catalogue';
const WORK_HEADERS = ['Artwork ID', 'Section', 'Title', 'Drive File ID or URL', 'Show on website', 'Sort order', 'Category'];
const CATALOG_SECTIONS = ['Work'];

const HEADERS = [
  'Enquiry ID','Timestamp','Name','Phone','Email','Source','Type',
  'Product / Reference','Size','Budget','Message','Reference Image','Status','Notes','Updated',
  'Reference ID','Artwork ID','Selected Catalogue Image','Client Uploaded Image'
];

const STATUSES = ['New','Contacted','Quoted','Confirmed','In progress','Completed','Cancelled'];
const SOURCES = ['Website','Instagram','WhatsApp','Other'];
const TYPES = ['Existing artwork','Custom artwork'];

function setupLunaQuilling() {
  const props = PropertiesService.getScriptProperties();
  const ss = getOrCreateSpreadsheet_(props);
  const sh = getOrCreateSheet_(ss, SHEET_NAME);
  prepareEnquiriesSheet_(sh);
  const folder = getOrCreateFolder_(props);
  const workFolder = getOrCreateWorkFolder_(props);
  const workSheet = getOrCreateSheet_(ss, WORK_SHEET_NAME);
  prepareWorkCatalogueSheet_(workSheet);
  migrateLegacyWorkSheet_(ss, workSheet);
  removeLegacyWorkUploadTriggers_();
  ensureWorkMenuTrigger_(ss);
  prepareDashboard_(ss);

  Logger.log('Spreadsheet: ' + ss.getUrl());
  Logger.log('Reference folder: ' + folder.getUrl());
  Logger.log('Work image folder: ' + workFolder.getUrl());
  Logger.log('Web app next: Deploy > New deployment > Web app > Execute as Me > Anyone');
}

function removeLegacyWorkUploadTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'handleWorkUploadFormSubmit')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

function getOrCreateSpreadsheet_(props) {
  const id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) {}
  }
  const ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function prepareEnquiriesSheet_(sh) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else {
    const first = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    const needsHeader = HEADERS.some((h, i) => first[i] !== h);
    if (needsHeader) sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sh.getRange('B:B').setNumberFormat('dd/mm/yyyy hh:mm');
  sh.getRange('O:O').setNumberFormat('dd/mm/yyyy hh:mm');

  const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  const sourceRule = SpreadsheetApp.newDataValidation().requireValueInList(SOURCES, true).setAllowInvalid(false).build();
  const typeRule = SpreadsheetApp.newDataValidation().requireValueInList(TYPES, true).setAllowInvalid(false).build();
  sh.getRange('F2:F5000').setDataValidation(sourceRule);
  sh.getRange('G2:G5000').setDataValidation(typeRule);
  sh.getRange('M2:M5000').setDataValidation(statusRule);
  sh.autoResizeColumns(1, HEADERS.length);
  sh.getRange('K:K').setWrap(true);
  sh.getRange('N:N').setWrap(true);
}

function getOrCreateFolder_(props) {
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  const folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function getOrCreateWorkFolder_(props) {
  const id = props.getProperty('WORK_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  const folder = DriveApp.createFolder(WORK_FOLDER_NAME);
  props.setProperty('WORK_FOLDER_ID', folder.getId());
  return folder;
}

function prepareWorkCatalogueSheet_(sh) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, WORK_HEADERS.length).setValues([WORK_HEADERS]);
  } else {
    const oldHeaders = ['Artwork ID', 'Title', 'Drive File ID or URL', 'Show on website', 'Sort order'];
    const columnCount = Math.max(sh.getLastColumn(), WORK_HEADERS.length);
    const first = sh.getRange(1, 1, 1, columnCount).getDisplayValues()[0].map(value => String(value).trim());
    const isCurrent = WORK_HEADERS.every((header, index) => first[index] === header);
    const isLegacy = oldHeaders.every((header, index) => first[index] === header);
    if (isLegacy) {
      const lastRow = sh.getLastRow();
      const oldRows = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, oldHeaders.length).getValues() : [];
      const newRows = oldRows.map(row => [row[0], 'Work', row[1], row[2], row[3], row[4], '']);
      sh.getRange(1, 1, Math.max(lastRow, 1), columnCount).clearContent();
      sh.getRange(1, 1, 1, WORK_HEADERS.length).setValues([WORK_HEADERS]);
      if (newRows.length) sh.getRange(2, 1, newRows.length, WORK_HEADERS.length).setValues(newRows);
    } else if (!isCurrent) {
      throw new Error('Work Catalogue headers do not match. Existing rows were left unchanged.');
    }
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, WORK_HEADERS.length).setFontWeight('bold');
  const sectionRule = SpreadsheetApp.newDataValidation().requireValueInList(CATALOG_SECTIONS, true).setAllowInvalid(false).build();
  sh.getRange('B2:B1000').setDataValidation(sectionRule);
  const checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sh.getRange('E2:E1000').setDataValidation(checkboxRule);
  sh.getRange('F2:F1000').setNumberFormat('0');
  sh.hideColumns(2);
  sh.hideColumns(7);
  sh.autoResizeColumns(1, WORK_HEADERS.length);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Luna Quilling')
    .addItem('Import existing Work images from Drive folder', 'importExistingWorkImages')
    .addSeparator()
    .addItem('Publish catalogue', 'publishWorkCatalogue')
    .addToUi();
}

function ensureWorkMenuTrigger_(ss) {
  const triggers = ScriptApp.getProjectTriggers().filter(trigger =>
    trigger.getHandlerFunction() === 'onOpen' &&
    trigger.getTriggerSourceId() === ss.getId()
  );
  if (triggers.length === 0) {
    ScriptApp.newTrigger('onOpen').forSpreadsheet(ss).onOpen().create();
  } else {
    triggers.slice(1).forEach(trigger => ScriptApp.deleteTrigger(trigger));
  }
}

function migrateLegacyWorkSheet_(ss, catalogueSheet) {
  const legacySheet = ss.getSheetByName('works');
  if (!legacySheet || legacySheet.getSheetId() === catalogueSheet.getSheetId()) return;

  const lastRow = legacySheet.getLastRow();
  const lastColumn = legacySheet.getLastColumn();
  if (lastRow === 0 || (lastRow === 1 && lastColumn === 0)) {
    ss.deleteSheet(legacySheet);
    return;
  }

  const header = legacySheet.getRange(1, 1, 1, Math.max(lastColumn, WORK_HEADERS.length))
    .getDisplayValues()[0]
    .slice(0, Math.max(lastColumn, WORK_HEADERS.length))
    .map(value => String(value).trim().toLowerCase());
  const currentHeader = WORK_HEADERS.map(value => value.toLowerCase());
  const oldHeader = ['artwork id', 'title', 'drive file id or url', 'show on website', 'sort order'];
  const hasCurrentHeader = currentHeader.every((value, index) => header[index] === value);
  const hasOldHeader = oldHeader.every((value, index) => header[index] === value);
  if (!hasCurrentHeader && !hasOldHeader) {
    legacySheet.hideSheet();
    Logger.log('The "works" tab was kept hidden as a backup because its columns do not match the Work Catalogue. Detected headers: ' + header.join(' | ') + '. No rows were changed.');
    return;
  }

  const legacyRows = lastRow > 1
    ? legacySheet.getRange(2, 1, lastRow - 1, hasCurrentHeader ? WORK_HEADERS.length : oldHeader.length).getValues()
    : [];
  const normalizedRows = hasCurrentHeader
    ? legacyRows
    : legacyRows.map(row => [row[0], 'Work', row[1], row[2], row[3], row[4], '']);
  const catalogueLastRow = catalogueSheet.getLastRow();
  const catalogueRows = catalogueLastRow > 1
    ? catalogueSheet.getRange(2, 1, catalogueLastRow - 1, WORK_HEADERS.length).getValues()
    : [];
  const existingFileIds = new Set();
  catalogueRows.forEach(row => {
    const input = String(row[3] || '').trim();
    if (input) existingFileIds.add(driveFileId_(input));
  });

  const migratedRows = normalizedRows.filter(row => {
    if (row.every(value => value === '' || value === null)) return false;
    const input = String(row[3] || '').trim();
    if (!input) return true;
    const fileId = driveFileId_(input);
    if (existingFileIds.has(fileId)) return false;
    existingFileIds.add(fileId);
    return true;
  });
  if (migratedRows.length) {
    catalogueSheet.getRange(catalogueSheet.getLastRow() + 1, 1, migratedRows.length, WORK_HEADERS.length)
      .setValues(migratedRows);
  }
  ss.deleteSheet(legacySheet);
}

function createWorkUploadForm() {
  const props = PropertiesService.getScriptProperties();
  const formId = props.getProperty('WORK_UPLOAD_FORM_ID');
  const form = formId
    ? FormApp.openById(formId)
    : FormApp.create('Luna Quilling — Upload Work Artwork');
  form.setDescription('Upload a new Work image and choose its category. The catalogue assigns the artwork ID automatically. After submission, tick Show on website in the Work Catalogue and publish when ready.');
  if (!form.getItems().some(item => item.getTitle() === 'Category')) {
    form.addListItem()
      .setTitle('Category')
      .setChoiceValues(WORK_CATEGORIES)
      .setRequired(true);
  }
  props.setProperty('WORK_UPLOAD_FORM_ID', form.getId());
  const triggers = ScriptApp.getProjectTriggers().filter(trigger =>
    trigger.getHandlerFunction() === 'handleWorkUploadFormSubmit' &&
    trigger.getTriggerSourceId() === form.getId()
  );
  if (triggers.length === 0) {
    ScriptApp.newTrigger('handleWorkUploadFormSubmit').forForm(form).onFormSubmit().create();
  } else {
    triggers.slice(1).forEach(trigger => ScriptApp.deleteTrigger(trigger));
  }
  Logger.log('Work upload Form (edit): ' + form.getEditUrl());
  Logger.log('Work upload Form (submit): ' + form.getPublishedUrl());
  SpreadsheetApp.getUi().alert(
    'Work upload Form created. Open its edit link in the execution log and add one required File upload question titled exactly "Artwork image". The Form then assigns new IDs automatically.'
  );
}

function handleWorkUploadFormSubmit(event) {
  if (!event || !event.response) throw new Error('This handler must run from the Work upload Form submit trigger.');
  const responses = event.response.getItemResponses();
  const categoryResponse = responses.find(response => response.getItem().getTitle() === 'Category');
  const imageResponse = responses.find(response => response.getItem().getTitle() === 'Artwork image');
  const category = categoryResponse ? String(categoryResponse.getResponse()).trim() : '';
  if (!WORK_CATEGORIES.includes(category)) throw new Error('The Form response has no valid Work category.');
  if (!imageResponse) throw new Error('Add a File upload question titled exactly "Artwork image" to the Work upload Form.');

  const responseValue = imageResponse.getResponse();
  const uploadedIds = Array.isArray(responseValue) ? responseValue : [responseValue];
  if (uploadedIds.length !== 1) throw new Error('Submit exactly one artwork image per Form response.');

  const fileId = driveFileId_(uploadedIds[0]);
  const file = DriveApp.getFileById(fileId);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.getMimeType())) {
    throw new Error('The uploaded file must be JPG, JPEG, PNG or WEBP.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
    const sh = ss.getSheetByName(WORK_SHEET_NAME);
    if (!sh) throw new Error('Work Catalogue sheet not found. Run setupLunaQuilling first.');
    prepareWorkCatalogueSheet_(sh);
    const lastRow = sh.getLastRow();
    const rows = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, WORK_HEADERS.length).getValues() : [];
    if (rows.some(row => row[1] === 'Work' && String(row[3] || '').trim() && driveFileId_(row[3]) === fileId)) {
      Logger.log(`Ignored duplicate Work Form upload for ${file.getName()}.`);
      return;
    }
    let nextId = Number(props.getProperty('NEXT_WORK_ID') || 0);
    let nextOrder = 0;
    rows.forEach(row => {
      if (String(row[1]) !== 'Work') return;
      const match = String(row[0] || '').match(/^WK(\d{3})$/);
      if (match) nextId = Math.max(nextId, Number(match[1]));
      nextOrder = Math.max(nextOrder, Number(row[5]) || 0);
    });
    nextId += 1;
    if (nextId > 999) throw new Error('The Work catalogue has reached its 999-ID limit.');
    const catalogId = `WK${String(nextId).padStart(3, '0')}`;
    file.moveTo(DriveApp.getFolderById(props.getProperty('WORK_FOLDER_ID')));
    sh.appendRow([catalogId, 'Work', file.getName(), file.getId(), false, nextOrder + 1, category]);
    props.setProperty('NEXT_WORK_ID', String(nextId));
    Logger.log(`Added ${catalogId} (${file.getName()}) from the Work upload Form. It is unchecked until published.`);
  } finally {
    lock.releaseLock();
  }
}

function importExistingWorkImages() {
  importExistingFolderImages_('Work');
}

function importExistingReferenceImages() {
  importExistingFolderImages_('References');
}

function importExistingFolderImages_(section) {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    `Import existing ${section} images`,
    'In Google Drive, upload the local folder once, open it, and copy its folder URL. Paste that URL here. Nested folders are scanned too.',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return;
  const sourceFolderId = driveFileId_(prompt.getResponseText());
  const targetFolderId = PropertiesService.getScriptProperties()
    .getProperty(section === 'Work' ? 'WORK_FOLDER_ID' : 'CATALOG_REFERENCES_FOLDER_ID');
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  const sh = ss.getSheetByName(WORK_SHEET_NAME);
  if (!sh) throw new Error('Work Catalogue sheet not found. Run setupLunaQuilling first.');
  prepareWorkCatalogueSheet_(sh);
  const lastRow = sh.getLastRow();
  const rows = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, WORK_HEADERS.length).getValues() : [];
  const existingIds = new Set(rows.filter(row => row[1] === section).map(row => {
    const value = String(row[3] || '').trim();
    return value ? driveFileId_(value) : '';
  }).filter(Boolean));
  const files = [];
  collectImageFiles_(DriveApp.getFolderById(sourceFolderId), files);
  files.sort((first, second) => first.getName().localeCompare(second.getName()));
  let nextId = Number(PropertiesService.getScriptProperties().getProperty(section === 'Work' ? 'NEXT_WORK_ID' : 'NEXT_REFERENCE_ID') || 0);
  let nextOrder = rows.reduce((largest, row) => row[1] === section ? Math.max(largest, Number(row[5]) || 0) : largest, 0);
  const prefix = section === 'Work' ? 'WK' : 'RF';
  rows.forEach(row => {
    if (row[1] !== section) return;
    const match = String(row[0] || '').match(new RegExp(`^${prefix}(\\d{3})$`));
    if (match) nextId = Math.max(nextId, Number(match[1]));
  });
  const importedRows = [];
  files.forEach(file => {
    if (existingIds.has(file.getId())) return;
    const parents = file.getParents();
    let alreadyInDestination = false;
    while (parents.hasNext()) {
      if (parents.next().getId() === targetFolderId) alreadyInDestination = true;
    }
    if (!alreadyInDestination) file.moveTo(DriveApp.getFolderById(targetFolderId));
    nextId += 1;
    if (nextId > 999) throw new Error(`The ${section} catalogue has reached its 999-ID limit.`);
    nextOrder += 1;
    importedRows.push([
      `${prefix}${String(nextId).padStart(3, '0')}`,
      section,
      file.getName(),
      file.getId(),
      true,
      nextOrder,
      section === 'References' ? getImageCategory_(file.getName()) : 'Our Work'
    ]);
    existingIds.add(file.getId());
  });
  if (importedRows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, importedRows.length, WORK_HEADERS.length).setValues(importedRows);
  }
  const propertyKey = section === 'Work' ? 'NEXT_WORK_ID' : 'NEXT_REFERENCE_ID';
  PropertiesService.getScriptProperties().setProperty(propertyKey, String(nextId));
  ui.alert(`${importedRows.length} ${section} images added to Work Catalogue and marked to show on the website. Publish the catalogue to apply.`);
}

function collectImageFiles_(folder, files) {
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const fileIterator = folder.getFiles();
  while (fileIterator.hasNext()) {
    const file = fileIterator.next();
    if (imageTypes.includes(file.getMimeType())) files.push(file);
  }
  const folderIterator = folder.getFolders();
  while (folderIterator.hasNext()) collectImageFiles_(folderIterator.next(), files);
}

function publishWorkCatalogue() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  const sh = ss.getSheetByName(WORK_SHEET_NAME);
  if (!sh) throw new Error('Work Catalogue sheet not found. Run setupLunaQuilling first.');
  prepareWorkCatalogueSheet_(sh);

  const lastRow = sh.getLastRow();
  const rows = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, WORK_HEADERS.length).getValues() : [];
  let nextId = Number(props.getProperty('NEXT_WORK_ID') || 0);
  const usedIds = new Set();
  rows.forEach(row => {
    const section = String(row[1] || '').trim();
    if (section !== 'Work') return;
    const match = String(row[0] || '').match(/^WK(\d{3})$/);
    if (match) nextId = Math.max(nextId, Number(match[1]));
  });

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    let section = String(row[1] || '').trim();
    if (!section) {
      section = 'Work';
      sh.getRange(rowNumber, 2).setValue(section);
    }
    if (section !== 'Work') return;
    const imageInput = String(row[3] || '').trim();
    const active = row[4] === true || String(row[4]).toLowerCase() === 'true';
    if (!imageInput) {
      if (active) throw new Error(`Add a Drive file ID or URL before activating row ${rowNumber}.`);
      return;
    }

    const fileId = driveFileId_(imageInput);
    const file = DriveApp.getFileById(fileId);
    let artworkId = String(row[0] || '').trim();
    if (!artworkId) {
      nextId += 1;
      if (nextId > 999) throw new Error('The Work catalogue has reached its 999-ID limit.');
      artworkId = `WK${String(nextId).padStart(3, '0')}`;
      sh.getRange(rowNumber, 1).setValue(artworkId);
    }
    if (!/^WK\d{3}$/.test(artworkId)) throw new Error(`Invalid Artwork ID in row ${rowNumber}. Use WK followed by three digits.`);
    if (usedIds.has(artworkId)) throw new Error(`Duplicate catalogue ID ${artworkId}.`);
    usedIds.add(artworkId);

    const workFolderId = props.getProperty('WORK_FOLDER_ID');
    const parents = file.getParents();
    let belongsToCatalogFolder = false;
    while (parents.hasNext()) {
      if (parents.next().getId() === workFolderId) {
        belongsToCatalogFolder = true;
        break;
      }
    }
    if (!belongsToCatalogFolder) throw new Error(`Drive image in row ${rowNumber} must be inside the Work image folder.`);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.getMimeType())) {
      throw new Error(`Unsupported image format in row ${rowNumber}. Use JPG, JPEG, PNG or WEBP.`);
    }
    if (active) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    if (!row[2]) sh.getRange(rowNumber, 3).setValue(file.getName());
    if (row[5] === '' || row[5] === null) sh.getRange(rowNumber, 6).setValue(index + 1);
    if (!row[6]) sh.getRange(rowNumber, 7).setValue('Our Work');
  });

  props.setProperty('NEXT_WORK_ID', String(nextId));
  props.setProperty('WORK_CATALOGUE_ENABLED', 'true');
  SpreadsheetApp.getUi().alert('Work catalogue published. Checked Work rows appear in the Work section. References remain loaded locally.');
}

function driveFileId_(value) {
  const input = String(value).trim();
  const match = input.match(/(?:\/d\/|\/folders\/|[?&]id=)([a-zA-Z0-9_-]{10,})/) || input.match(/^([a-zA-Z0-9_-]{10,})$/);
  if (!match) throw new Error(`Invalid Drive file ID or URL: ${input}`);
  return match[1];
}

function getImageCategory_(name) {
  const filename = String(name).toLowerCase();
  if (/birthday|anniversary|wedding|engagement|teacher|occasion|celebration|farewell|festival|diya/.test(filename)) return 'Celebrations';
  if (/name|initial|monogram/.test(filename)) return 'Names & Initials';
  if (/portrait|couple|family|baby|child|mother|father|friend|person/.test(filename)) return 'People & Portraits';
  if (/flower|floral|rose|garden|nature|bird|moon/.test(filename)) return 'Floral & Nature';
  if (/quill|paper|art|frame|design|gift|memory|box|lamp/.test(filename)) return 'Quilling Art';
  return 'Other';
}

function getWorkCatalogue_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('WORK_CATALOGUE_ENABLED') !== 'true') {
    return {enabled: false, images: []};
  }

  const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
  const sh = ss.getSheetByName(WORK_SHEET_NAME);
  if (!sh) throw new Error('Work Catalogue sheet not found. Run setupLunaQuilling first.');
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return {enabled: true, images: []};

  const images = sh.getRange(2, 1, lastRow - 1, WORK_HEADERS.length).getValues()
    .map(row => ({
      catalogId: String(row[0] || '').trim(),
      section: String(row[1] || '').trim(),
      title: String(row[2] || '').trim(),
      fileInput: String(row[3] || '').trim(),
      active: row[4] === true || String(row[4]).toLowerCase() === 'true',
      order: Number(row[5]) || 0,
      category: String(row[6] || '').trim()
    }))
    .filter(item => item.section === 'Work' && item.active && /^WK\d{3}$/.test(item.catalogId) && item.fileInput)
    .sort((first, second) => first.order - second.order || first.catalogId.localeCompare(second.catalogId))
    .map(item => {
      const fileId = driveFileId_(item.fileInput);
      return {
        catalogId: item.catalogId,
        fileId,
        filename: item.title || item.catalogId,
        title: item.title || item.catalogId,
        category: 'Our Work',
        src: `/api/work-image/${encodeURIComponent(item.catalogId)}`
      };
    });
  return {enabled: true, images};
}

function getCatalogImageFileId_(catalogId) {
  if (!/^WK\d{3}$/.test(catalogId || '')) throw new Error('Invalid Work Artwork ID.');
  const catalogue = getWorkCatalogue_();
  const selected = catalogue.images.find(image => image.catalogId === catalogId);
  if (!selected) throw new Error('Image is not active in the catalogue.');
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  const sh = ss.getSheetByName(WORK_SHEET_NAME);
  const rows = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), WORK_HEADERS.length).getValues();
  const row = rows.find(values => String(values[0]).trim() === catalogId);
  if (!row) throw new Error('Catalogue image not found.');
  return driveFileId_(row[3]);
}

function prepareDashboard_(ss) {
  const sh = getOrCreateSheet_(ss, DASHBOARD_NAME);
  sh.clear();
  sh.getRange('A1').setValue('LUNA QUILLING — ENQUIRY DASHBOARD').setFontWeight('bold').setFontSize(16);
  sh.getRange('A3:B3').setValues([['STATUS','COUNT']]).setFontWeight('bold');
  STATUSES.forEach((status, i) => {
    const row = 4 + i;
    sh.getRange(row,1).setValue(status);
    sh.getRange(row,2).setFormula(`=COUNTIF(Enquiries!M:M,A${row})`);
  });
  sh.getRange('D3:E3').setValues([['SOURCE','COUNT']]).setFontWeight('bold');
  SOURCES.forEach((source, i) => {
    const row = 4 + i;
    sh.getRange(row,4).setValue(source);
    sh.getRange(row,5).setFormula(`=COUNTIF(Enquiries!F:F,D${row})`);
  });
  sh.getRange('G3:H3').setValues([['TYPE','COUNT']]).setFontWeight('bold');
  TYPES.forEach((type, i) => {
    const row = 4 + i;
    sh.getRange(row,7).setValue(type);
    sh.getRange(row,8).setFormula(`=COUNTIF(Enquiries!G:G,G${row})`);
  });
  sh.getRange('A13').setValue('RECENT ENQUIRIES').setFontWeight('bold');
  sh.getRange('A14:H14').setValues([['ID','Date','Name','Source','Type','Product','Budget','Status']]).setFontWeight('bold');
  sh.getRange('A15').setFormula('=IFERROR(QUERY(Enquiries!A2:O,"select A,B,C,F,G,H,J,M where A is not null order by B desc limit 15",0),"")');
  sh.getRange('B15:B30').setNumberFormat('dd/mm/yyyy hh:mm');
  sh.autoResizeColumns(1,8);
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  try {
    if (action === 'work') {
      return json_({ok: true, ...getWorkCatalogue_()});
    }
    if (action === 'work-image') {
      return json_({ok: true, fileId: getCatalogImageFileId_(e.parameter.id || '')});
    }
    return json_({ok:true, service:'Luna Quilling enquiry endpoint', version:'7.0'});
  } catch (err) {
    return json_({ok:false, error:String(err && (err.message || err))});
  }
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!data.name || !data.phone || !data.message) throw new Error('Missing required fields');

    const props = PropertiesService.getScriptProperties();
    const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
    const sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) throw new Error('Enquiries sheet not found. Run setupLunaQuilling first.');

    const id = nextEnquiryId_(sh);
    let refUrl = '';
    const referenceUrls = [];
    const referenceId = /^RF\d{2,3}$/.test(data.referenceId || '') ? data.referenceId : '';
    const artworkId = /^WK\d{2,3}$/.test(data.artworkId || '') ? data.artworkId : '';
    const catalogImageId = data.catalogImageId === referenceId || data.catalogImageId === artworkId
      ? data.catalogImageId
      : '';
    const referencesToSave = [
      {kind: 'upload', base64: data.referenceBase64, name: data.referenceName, type: data.referenceType},
      {kind: 'catalog', base64: data.catalogImageBase64, name: data.catalogImageName, type: data.catalogImageType, id: catalogImageId}
    ].filter(reference => reference.base64 && reference.name);
    let catalogImageUrl = '';
    let clientUploadUrl = '';
    if (referencesToSave.length) {
      const folder = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
      referencesToSave.forEach(reference => {
        const bytes = Utilities.base64Decode(reference.base64);
        const safeName = sanitizeFileName_(reference.name);
        const fileName = reference.id && reference.id === (artworkId || referenceId)
          ? `${reference.id}_${safeName}`
          : safeName;
        const blob = Utilities.newBlob(bytes, reference.type || 'image/jpeg', fileName);
        const url = folder.createFile(blob).getUrl();
        referenceUrls.push(url);
        if (reference.kind === 'catalog') {
          catalogImageUrl = url;
        } else {
          clientUploadUrl = url;
        }
      });
      refUrl = referenceUrls.join('\n');
    }

    const now = new Date();
    const source = SOURCES.includes(data.source) ? data.source : 'Website';
    const type = TYPES.includes(data.type) ? data.type : 'Custom artwork';
    const product = data.product || '';
    const selectedCatalogId = artworkId || referenceId;
    const productReference = selectedCatalogId ? `${product} — ${selectedCatalogId}` : product;
    const message = selectedCatalogId
      ? `[${artworkId ? 'Artwork' : 'Reference'} ID: ${selectedCatalogId}]\n${data.message}`
      : data.message;

    sh.appendRow([
      id, now, data.name, data.phone, data.email || '', source, type,
      productReference, data.size || '', data.budget || '', message, refUrl,
      'New', '', now, referenceId, artworkId,
      catalogImageUrl ? sheetLink_(catalogImageUrl, `${catalogImageId} image`) : '',
      clientUploadUrl ? sheetLink_(clientUploadUrl, 'Uploaded image') : ''
    ]);

    const subject = `New Luna Quilling enquiry — ${id} — ${data.name}`;
    const ownerBody = [
      'NEW LUNA QUILLING ENQUIRY', '',
      'Enquiry ID: ' + id,
      'Name: ' + data.name,
      'WhatsApp: ' + data.phone,
      'Email: ' + (data.email || 'not provided'),
      'Source: ' + source,
      'Type: ' + type,
      'Product / Reference: ' + productReference,
      'Reference ID: ' + (referenceId || 'none'),
      'Artwork ID: ' + (artworkId || 'none'),
      'Size: ' + (data.size || 'not specified'),
      'Budget: ' + (data.budget || 'not specified'),
      'Message: ' + message,
      'Selected catalogue image: ' + (catalogImageUrl || 'none'),
      'Client uploaded image: ' + (clientUploadUrl || 'none'), '',
      'Open the Luna Quilling Enquiry Centre spreadsheet to update Status/Notes.'
    ].join('\n');
    MailApp.sendEmail(OWNER_EMAIL, subject, ownerBody);

    if (data.email) {
      const customerBody = [
        'Hi ' + data.name + ',', '',
        'Thank you for contacting Luna Quilling.',
        'We have received your enquiry (' + id + ').',
        '',
        'Rathana will contact you directly to discuss the design, price and delivery details.',
        '',
        'Luna Quilling',
        'Instagram: @lunaquilling'
      ].join('\n');
      MailApp.sendEmail(data.email, 'Luna Quilling — enquiry received (' + id + ')', customerBody);
    }

    return json_({ok:true, enquiryId:id});
  } catch (err) {
    return json_({ok:false, error:String(err && (err.message || err))});
  }
}

function nextEnquiryId_(sh) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 'LQ-0001';
  const ids = sh.getRange(2,1,lastRow-1,1).getValues().flat().filter(Boolean);
  let max = 0;
  ids.forEach(v => {
    const m = String(v).match(/LQ-(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return 'LQ-' + String(max + 1).padStart(4,'0');
}

function sanitizeFileName_(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120);
}

function sheetLink_(url, label) {
  const safeUrl = String(url).replace(/"/g, '""');
  const safeLabel = String(label).replace(/"/g, '""');
  return `=HYPERLINK("${safeUrl}","${safeLabel}")`;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
