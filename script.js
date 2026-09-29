const form = document.querySelector('#enquiryForm');
const productSelect = document.querySelector('#productSelect');
const statusEl = document.querySelector('#formStatus');
const fileInput = document.querySelector('#reference');
const fileName = document.querySelector('#fileName');
const referenceIdInput = document.querySelector('#referenceId');
const artworkIdInput = document.querySelector('#artworkId');
const selectedReference = document.querySelector('#selectedReference');
const selectedReferenceImage = document.querySelector('#selectedReferenceImage');
const selectedReferenceId = document.querySelector('#selectedReferenceId');
const selectedReferenceName = document.querySelector('#selectedReferenceName');
const referenceIdLookup = document.querySelector('#referenceIdLookup');
const referenceIdStatus = document.querySelector('#referenceIdStatus');
const sourceSelect = document.querySelector('#source');
const typeSelect = document.querySelector('#type');
const referencesCategory = document.querySelector('#referencesCategory');
const CATALOG_PAGE_SIZE = 5;
let referenceImages = [];
let workImages = [];
let referencePage = 0;
let workPage = 0;
let selectedCatalogReference = null;

document.querySelector('#year').textContent = new Date().getFullYear();

loadArtworkGallery();

async function loadArtworkGallery() {
  const workStatus = document.querySelector('#workGalleryStatus');
  const referencesStatus = document.querySelector('#referencesGalleryStatus');
  if (location.protocol === 'file:') {
    workStatus.textContent = 'Open this website from its published link or a local web server to load artwork.';
    referencesStatus.textContent = 'Open this website from its published link or a local web server to load references.';
    return;
  }

  try {
    let catalog = window.LUNA_CATALOG;
    if (!catalog) {
      const response = await fetch('./catalog.json');
      if (!response.ok) throw new Error(`Image list request failed (${response.status}).`);
      catalog = await response.json();
    }
    if (!Array.isArray(catalog.work) || !Array.isArray(catalog.references)) {
      throw new Error('The image list response was invalid.');
    }

    workImages = catalog.work;
    referenceImages = catalog.references;
    const categories = [...new Set(referenceImages.map(image => image.category))].sort();
    referencesCategory.replaceChildren(new Option('All categories', 'all'));
    categories.forEach(category => referencesCategory.add(new Option(category, category)));
    renderWorkGallery();
    renderReferenceGallery();
    populateIdeaImages();
    workStatus.hidden = true;
    referencesStatus.hidden = true;
  } catch (error) {
    console.error('Could not load artwork galleries.', error);
    workStatus.textContent = 'Could not load artwork. Please refresh the page or try again later.';
    referencesStatus.textContent = 'Could not load references. Please refresh the page or try again later.';
  }
}

function populateIdeaImages() {
  const categoryOffsets = new Map();
  document.querySelectorAll('.products .product img[data-idea-reference]').forEach(img => {
    const category = img.dataset.ideaReference;
    const matches = referenceImages.filter(image => image.category === category);
    if (!matches.length) return;

    const offset = categoryOffsets.get(category) || 0;
    const image = matches[offset % matches.length];
    categoryOffsets.set(category, offset + 1);
    img.src = image.src;
    img.alt = `${image.catalogId} ${category} idea reference`;
    img.dataset.catalogId = image.catalogId;

    const idLabel = img.parentElement.querySelector('.idea-reference-id');
    idLabel.textContent = image.catalogId;
    idLabel.hidden = false;
  });
}

function createCatalogCard(image, isWork) {
  const card = document.createElement('figure');
  card.className = `gallery-card reference-card${isWork ? ' work-card' : ''}`;

  const img = document.createElement('img');
  img.src = image.src;
  img.alt = `${image.catalogId} ${isWork ? 'artwork' : 'reference'} image`;
  img.loading = 'lazy';

  const caption = document.createElement('figcaption');
  const catalogId = document.createElement('span');
  catalogId.className = 'reference-id';
  catalogId.textContent = image.catalogId;
  caption.append(catalogId);
  if (!isWork) {
    const category = document.createElement('span');
    category.className = 'tag';
    category.textContent = ` ${image.category}`;
    caption.append(document.createElement('br'), category);
  }

  const actions = document.createElement('div');
  actions.className = 'product-foot';
  const enquire = document.createElement('button');
  enquire.type = 'button';
  enquire.textContent = 'Enquire';
  enquire.addEventListener('click', () => selectCatalogImage(image, isWork));
  actions.append(enquire);
  card.append(img, caption, actions);
  return card;
}

function selectCatalogImage(image, isWork) {
  selectedCatalogReference = { ...image, isWork };
  referenceIdInput.value = isWork ? '' : image.catalogId;
  artworkIdInput.value = isWork ? image.catalogId : '';
  selectedReferenceImage.src = image.src;
  selectedReferenceImage.alt = `${image.catalogId} selected ${isWork ? 'artwork' : 'reference'}`;
  selectedReferenceId.textContent = image.catalogId;
  selectedReferenceName.textContent = isWork ? 'Our Work' : image.category;
  selectedReference.hidden = false;
  referenceIdLookup.value = isWork ? '' : image.catalogId;
  referenceIdStatus.textContent = isWork ? '' : `Reference ${image.catalogId} selected.`;
  delete referenceIdStatus.dataset.error;
  productSelect.value = isWork ? 'Something else' : 'Custom artwork';
  typeSelect.value = isWork ? 'Existing artwork' : 'Custom artwork';
  fileName.textContent = `Selected catalogue image (${image.catalogId}) will be attached automatically.`;
  document.querySelector('#custom').scrollIntoView({behavior:'smooth', block:'start'});
}

function clearSelectedCatalogImage() {
  selectedCatalogReference = null;
  referenceIdInput.value = '';
  artworkIdInput.value = '';
  selectedReference.hidden = true;
}

function findReferenceById() {
  const requestedId = referenceIdLookup.value.trim().toUpperCase();
  referenceIdLookup.value = requestedId;
  const image = referenceImages.find(item => item.catalogId === requestedId);
  if (!image) {
    referenceIdStatus.textContent = requestedId
      ? `Reference ${requestedId} was not found. Check the ID and try again.`
      : 'Enter a reference ID such as RF006.';
    referenceIdStatus.dataset.error = '1';
    return;
  }

  selectCatalogImage(image, false);
  referenceIdStatus.textContent = `Reference ${image.catalogId} selected and attached to this enquiry.`;
}

document.querySelector('#referenceIdLookupButton').addEventListener('click', findReferenceById);
referenceIdLookup.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    findReferenceById();
  }
});
referenceIdLookup.addEventListener('input', () => {
  referenceIdStatus.textContent = '';
  delete referenceIdStatus.dataset.error;
  if (selectedCatalogReference && referenceIdLookup.value.trim().toUpperCase() !== selectedCatalogReference.catalogId) {
    clearSelectedCatalogImage();
    fileName.textContent = fileInput.files[0] ? fileInput.files[0].name : 'JPG / PNG / WEBP • up to 5 MB';
  }
});

function renderWorkGallery() {
  const pageCount = Math.ceil(workImages.length / CATALOG_PAGE_SIZE);
  workPage = Math.min(workPage, Math.max(0, pageCount - 1));
  const pageImages = workImages.slice(workPage * CATALOG_PAGE_SIZE, (workPage + 1) * CATALOG_PAGE_SIZE);
  document.querySelector('#workGallery').replaceChildren(...pageImages.map(image => createCatalogCard(image, true)));
  updatePagination('work', workPage, pageCount);
}

function renderReferenceGallery() {
  const selectedCategory = referencesCategory.value;
  const visibleImages = selectedCategory === 'all'
    ? referenceImages
    : referenceImages.filter(image => image.category === selectedCategory);
  const pageCount = Math.ceil(visibleImages.length / CATALOG_PAGE_SIZE);
  referencePage = Math.min(referencePage, Math.max(0, pageCount - 1));
  const pageImages = visibleImages.slice(
    referencePage * CATALOG_PAGE_SIZE,
    (referencePage + 1) * CATALOG_PAGE_SIZE
  );

  document.querySelector('#referencesGallery').replaceChildren(...pageImages.map(image => createCatalogCard(image, false)));

  updatePagination('references', referencePage, pageCount);
}

function updatePagination(catalog, currentPage, pageCount) {
  const pageCountLabel = document.querySelector(`#${catalog}PageStatus`);
  const pageNumbers = document.querySelector(`#${catalog}PageNumbers`);
  const previous = document.querySelector(`#${catalog}Previous`);
  const next = document.querySelector(`#${catalog}Next`);

  pageCountLabel.textContent = pageCount ? `Page ${currentPage + 1} of ${pageCount}` : 'No images';
  previous.disabled = currentPage === 0;
  next.disabled = currentPage >= pageCount - 1;

  const firstPage = Math.max(0, Math.min(currentPage - 2, pageCount - 5));
  const lastPage = Math.min(pageCount, firstPage + 5);
  const buttons = [];
  for (let page = firstPage; page < lastPage; page += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(page + 1);
    button.setAttribute('aria-label', `Go to ${catalog} page ${page + 1}`);
    if (page === currentPage) {
      button.className = 'active';
      button.setAttribute('aria-current', 'page');
    }
    button.addEventListener('click', () => {
      if (catalog === 'work') {
        workPage = page;
        renderWorkGallery();
      } else {
        referencePage = page;
        renderReferenceGallery();
      }
    });
    buttons.push(button);
  }
  pageNumbers.replaceChildren(...buttons);
}

referencesCategory.addEventListener('change', () => {
  referencePage = 0;
  renderReferenceGallery();
});
document.querySelector('#referencesPrevious').addEventListener('click', () => {
  if (referencePage > 0) {
    referencePage -= 1;
    renderReferenceGallery();
  }
});
document.querySelector('#referencesNext').addEventListener('click', () => {
  referencePage += 1;
  renderReferenceGallery();
});
document.querySelector('#workPrevious').addEventListener('click', () => {
  if (workPage > 0) {
    workPage -= 1;
    renderWorkGallery();
  }
});
document.querySelector('#workNext').addEventListener('click', () => {
  workPage += 1;
  renderWorkGallery();
});

const params = new URLSearchParams(location.search);
const sourceParam = params.get('source');
if (['Website','Instagram','WhatsApp','Other'].includes(sourceParam)) sourceSelect.value = sourceParam;

function setStatus(msg, error=false){
  statusEl.textContent = msg;
  statusEl.dataset.error = error ? '1' : '0';
}

document.querySelectorAll('[data-product]').forEach(btn => {
  btn.addEventListener('click', () => {
    const ideaImage = btn.closest('.product')?.querySelector('img[data-catalog-id]');
    const image = ideaImage && referenceImages.find(item => item.catalogId === ideaImage.dataset.catalogId);
    if (image) {
      selectCatalogImage(image, false);
    } else {
      clearSelectedCatalogImage();
      referenceIdLookup.value = '';
      referenceIdStatus.textContent = '';
      fileName.textContent = fileInput.files[0] ? fileInput.files[0].name : 'JPG / PNG / WEBP • up to 5 MB';
    }
    productSelect.value = btn.dataset.product;
    typeSelect.value = 'Existing artwork';
    document.querySelector('#custom').scrollIntoView({behavior:'smooth', block:'start'});
  });
});

document.querySelectorAll('[data-custom]').forEach(btn => {
  btn.addEventListener('click', () => {
    productSelect.value = 'Custom artwork';
    typeSelect.value = 'Custom artwork';
    clearSelectedCatalogImage();
    referenceIdLookup.value = '';
    referenceIdStatus.textContent = '';
    document.querySelector('#custom').scrollIntoView({behavior:'smooth', block:'start'});
  });
});

fileInput.addEventListener('change', () => {
  const selectedFile = fileInput.files[0];
  const fileLabel = selectedFile ? selectedFile.name : 'JPG / PNG / WEBP • up to 5 MB';
  fileName.textContent = selectedCatalogReference
    ? `${fileLabel}; catalogue image ${selectedCatalogReference.catalogId} will also be attached`
    : fileLabel;
});

form.addEventListener('submit', async ev => {
  ev.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const file = fileInput.files[0];
  const cleanPhone = data.phone.replace(/\s+/g,'');
  if (file && file.size > 5*1024*1024) return setStatus('Please choose an image smaller than 5 MB.', true);
  if (!/^(\+91)?[6-9]\d{9}$/.test(cleanPhone)) return setStatus('Please enter a valid Indian WhatsApp number.', true);
  if (!CONFIG.SCRIPT_URL) return setStatus('The enquiry system is not connected yet. Please use WhatsApp while setup is being completed.', true);

  setStatus('Sending your enquiry…');
  const payload = {...data, phone:cleanPhone, timestamp:new Date().toISOString()};
  try {
    if (file) {
      payload.referenceName = file.name;
      payload.referenceType = file.type;
      payload.referenceBase64 = await fileToBase64(file);
    }
    if (selectedCatalogReference) {
      const response = await fetch(selectedCatalogReference.src);
      if (!response.ok) throw new Error(`Could not load selected catalogue image (${response.status}).`);
      const catalogFile = await response.blob();
      payload.catalogImageName = selectedCatalogReference.filename;
      payload.catalogImageId = selectedCatalogReference.catalogId;
      payload.catalogImageType = catalogFile.type;
      payload.catalogImageBase64 = await fileToBase64(catalogFile);
    }

    await fetch(CONFIG.SCRIPT_URL, {
      method:'POST', mode:'no-cors',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload)
    });
    form.reset();
    selectedCatalogReference = null;
    selectedReference.hidden = true;
    referenceIdStatus.textContent = '';
    delete referenceIdStatus.dataset.error;
    sourceSelect.value = sourceParam && ['Website','Instagram','WhatsApp','Other'].includes(sourceParam) ? sourceParam : 'Website';
    fileName.textContent = 'JPG / PNG / WEBP • up to 5 MB';
    setStatus('Enquiry received. Rathana will contact you directly on WhatsApp.');
  } catch (err) {
    console.error(err);
    setStatus(err instanceof TypeError && selectedCatalogReference
      ? 'We could not attach the selected catalogue image. Please try again or choose a file upload.'
      : 'We could not send the form right now. Please use WhatsApp instead.', true);
  }
});

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
