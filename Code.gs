// ============================================================
// Joelhood Pictures Limited — Casting Roster backend
// Deploy: Extensions > Apps Script > Deploy > New deployment
//   Type: Web app | Execute as: Me | Who has access: Anyone
// Script Properties to set (Project Settings > Script Properties):
//   ADMIN_PASSWORD   -> password for admin.html
//   DRIVE_FOLDER_ID  -> Google Drive folder ID for headshots
//   SITE_URL         -> your GitHub Pages base URL, e.g. https://you.github.io/jpl-talent-roster/
//   ADMIN_EMAIL      -> email that gets notified of new casting briefs (e.g. joelhoodpictures@ymail.com)
// ============================================================

const ACTORS_SHEET = 'Actors';
const BRIEFS_SHEET = 'Briefs';

const ACTOR_HEADERS = ['ID','Name','Bio','Category','Experience','Languages','Accents',
  'Gender','CastingAge','Height','BodyType','Hair','EyeColour','DistinguishingFeatures',
  'SpecialSkills','AdmissionStatus','HeadshotURL','Instagram','Twitter','TikTok','YouTube',
  'Facebook','Showreel','Status','EditToken','DateAdded'];

const BRIEF_HEADERS = ['BriefID','ProducerEmail','CompanyName','Country','TaxPin','ProducerName','ProductionTitle',
  'Director','ContactPerson','CharacterName','AgeRange','RoleGender','CharacterDescription',
  'Language','Accent','PhysicalRequirements','ActingRequirements','SpecialSkillsNeeded',
  'ProductionType','ShootDates','Location','NumberOfDays','Compensation','AuditionRequirements',
  'Deadline','VisitNumber','PricingTier','Status','ShortlistIDs','SubmittedDate'];

const ACTOR_FIELD_MAP = {
  name:'Name', bio:'Bio', category:'Category', experience:'Experience', languages:'Languages',
  accents:'Accents', gender:'Gender', castingAge:'CastingAge', height:'Height', bodyType:'BodyType',
  hair:'Hair', eyeColour:'EyeColour', distinguishingFeatures:'DistinguishingFeatures',
  specialSkills:'SpecialSkills', admissionStatus:'AdmissionStatus', showreel:'Showreel',
  instagram:'Instagram', twitter:'Twitter', tiktok:'TikTok', youtube:'YouTube', facebook:'Facebook'
};

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}
function actorsSheet_(){ return getSheet_(ACTORS_SHEET, ACTOR_HEADERS); }
function briefsSheet_(){ return getSheet_(BRIEFS_SHEET, BRIEF_HEADERS); }

function getProp_(key){ return PropertiesService.getScriptProperties().getProperty(key); }
function getAdminPassword_(){ return getProp_('ADMIN_PASSWORD'); }
function getDriveFolderId_(){ return getProp_('DRIVE_FOLDER_ID'); }
function getSiteUrl_(){ return getProp_('SITE_URL') || ''; }
function getAdminEmail_(){ return getProp_('ADMIN_EMAIL') || ''; }

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function headerIndex_(headers){
  const idx = {}; headers.forEach((h,i) => idx[h]=i); return idx;
}

// Generates the next ID by scanning existing IDs for the highest number and adding 1.
// Safer than counting rows, which breaks once anything has ever been deleted.
function nextId_(data, idCol, prefix, padLen){
  let max = 0;
  for (let i = 1; i < data.length; i++){
    const m = String(data[i][idCol] || '').match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1]));
  }
  return prefix + String(max + 1).padStart(padLen, '0');
}

function rowToActor_(row, idx){
  return {
    id: row[idx.ID], name: row[idx.Name], bio: row[idx.Bio], category: row[idx.Category],
    experience: row[idx.Experience], languages: row[idx.Languages], accents: row[idx.Accents],
    gender: row[idx.Gender], castingAge: row[idx.CastingAge], height: row[idx.Height],
    bodyType: row[idx.BodyType], hair: row[idx.Hair], eyeColour: row[idx.EyeColour],
    distinguishingFeatures: row[idx.DistinguishingFeatures], specialSkills: row[idx.SpecialSkills],
    admissionStatus: row[idx.AdmissionStatus], headshot: row[idx.HeadshotURL],
    instagram: row[idx.Instagram], twitter: row[idx.Twitter], tiktok: row[idx.TikTok],
    youtube: row[idx.YouTube], facebook: row[idx.Facebook], showreel: row[idx.Showreel],
    status: row[idx.Status]
  };
}

// ---------- GET ----------
// Run this once from the editor (select it in the dropdown next to Run, click Run).
// It doesn't change anything — it just touches Drive and Mail so Google prompts you
// to authorize both, since doGet/doPost can't be run directly to trigger that prompt.
// Run this once if any actors already have photos that show as a blank/green box.
// Rewrites old-format Drive URLs to the reliable thumbnail format. Safe to run more than once.
function fixHeadshotUrls(){
  const sheet = actorsSheet_();
  const data = sheet.getDataRange().getValues();
  const idx = headerIndex_(data[0]);
  let fixed = 0;
  for (let i = 1; i < data.length; i++){
    const url = data[i][idx.HeadshotURL];
    if (!url) continue;
    const m = String(url).match(/id=([a-zA-Z0-9_-]+)/);
    if (m && url.indexOf('/thumbnail?') === -1){
      sheet.getRange(i + 1, idx.HeadshotURL + 1).setValue('https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1000');
      fixed++;
    }
  }
  Logger.log('Fixed ' + fixed + ' headshot URL(s).');
}

function setupAuthorize(){
  Logger.log('Site URL property: ' + getSiteUrl_());
  Logger.log('Admin email property: ' + getAdminEmail_());
  Logger.log('Drive folder accessible: ' + DriveApp.getFolderById(getDriveFolderId_()).getName());
  Logger.log('Mail quota remaining today: ' + MailApp.getRemainingDailyQuota());
  Logger.log('If you see values above with no errors, authorization is complete.');
}

function doGet(e){
  const action = e.parameter.action;

  if (action === 'get') {
    const sheet = actorsSheet_();
    const data = sheet.getDataRange().getValues();
    const idx = headerIndex_(data[0]);
    const r = data.slice(1).find(r => r[idx.ID] === e.parameter.id);
    if (!r || r[idx.Status] !== 'Active') return json_({ ok:false, error:'Not found' });
    return json_({ ok:true, actor: rowToActor_(r, idx) });
  }

  if (action === 'previewGet') {
    if (e.parameter.password !== getAdminPassword_()) return json_({ ok:false, error:'Unauthorized' });
    const sheet = actorsSheet_();
    const data = sheet.getDataRange().getValues();
    const idx = headerIndex_(data[0]);
    const r = data.slice(1).find(r => r[idx.ID] === e.parameter.id);
    if (!r) return json_({ ok:false, error:'Not found' });
    const actor = rowToActor_(r, idx);
    return json_({ ok:true, actor: actor, preview: true });
  }

  if (action === 'actorGet') {
    const sheet = actorsSheet_();
    const data = sheet.getDataRange().getValues();
    const idx = headerIndex_(data[0]);
    const r = data.slice(1).find(r => r[idx.EditToken] === e.parameter.token);
    if (!r) return json_({ ok:false, error:'Invalid link' });
    return json_({ ok:true, actor: rowToActor_(r, idx) });
  }

  if (action === 'adminList') {
    if (e.parameter.password !== getAdminPassword_()) return json_({ ok:false, error:'Unauthorized' });
    const sheet = actorsSheet_();
    const data = sheet.getDataRange().getValues();
    const idx = headerIndex_(data[0]);
    const actors = data.slice(1).map(r => {
      const a = rowToActor_(r, idx);
      a.editToken = r[idx.EditToken];
      a.dateAdded = r[idx.DateAdded];
      return a;
    });
    return json_({ ok:true, actors: actors });
  }

  if (action === 'adminListBriefs') {
    if (e.parameter.password !== getAdminPassword_()) return json_({ ok:false, error:'Unauthorized' });
    const sheet = briefsSheet_();
    const data = sheet.getDataRange().getValues();
    const idx = headerIndex_(data[0]);
    const briefs = data.slice(1).map(r => {
      const b = {};
      BRIEF_HEADERS.forEach(h => b[h.charAt(0).toLowerCase() + h.slice(1)] = r[idx[h]]);
      return b;
    }).reverse();
    return json_({ ok:true, briefs: briefs });
  }

  return json_({ ok:false, error:'Unknown action' });
}

// ---------- POST ----------
function doPost(e){
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  if (action === 'addActor' || action === 'updateActorAdmin' || action === 'toggleStatus' || action === 'deleteActor') {
    if (body.password !== getAdminPassword_()) return json_({ ok:false, error:'Unauthorized' });
  }

  if (action === 'addActor') {
    const sheet = actorsSheet_();
    const data = sheet.getDataRange().getValues();
    const idx = headerIndex_(data[0]);
    const id = nextId_(data, idx.ID, 'JPL-', 3);
    const token = Utilities.getUuid();
    const row = data[0].map(h => '');
    row[idx.ID] = id;
    Object.keys(ACTOR_FIELD_MAP).forEach(f => { if (body[f] !== undefined) row[idx[ACTOR_FIELD_MAP[f]]] = body[f]; });
    row[idx.AdmissionStatus] = body.admissionStatus || 'Approved';
    row[idx.Status] = 'Active';
    row[idx.EditToken] = token;
    row[idx.DateAdded] = new Date().toISOString();
    sheet.appendRow(row);
    return json_({ ok:true, id: id, editToken: token });
  }

  if (action === 'updateActorAdmin' || action === 'toggleStatus' || action === 'deleteActor') {
    const sheet = actorsSheet_();
    const data = sheet.getDataRange().getValues();
    const idx = headerIndex_(data[0]);
    for (let i = 1; i < data.length; i++) {
      if (data[i][idx.ID] === body.id) {
        const rowNum = i + 1;
        if (action === 'deleteActor'){ sheet.deleteRow(rowNum); return json_({ ok:true }); }
        if (action === 'toggleStatus'){
          const cur = data[i][idx.Status];
          sheet.getRange(rowNum, idx.Status + 1).setValue(cur === 'Active' ? 'Hidden' : 'Active');
          return json_({ ok:true });
        }
        Object.keys(ACTOR_FIELD_MAP).forEach(f => {
          if (body[f] !== undefined) sheet.getRange(rowNum, idx[ACTOR_FIELD_MAP[f]] + 1).setValue(body[f]);
        });
        return json_({ ok:true });
      }
    }
    return json_({ ok:false, error:'Actor not found' });
  }

  if (action === 'actorUpdate') {
    const sheet = actorsSheet_();
    const data = sheet.getDataRange().getValues();
    const idx = headerIndex_(data[0]);
    let rowNum = -1;
    for (let i = 1; i < data.length; i++) { if (data[i][idx.EditToken] === body.token){ rowNum = i+1; break; } }
    if (rowNum === -1) return json_({ ok:false, error:'Invalid link' });
    if (body.photoBase64){
      const bytes = Utilities.base64Decode(body.photoBase64.split(',').pop());
      const PHOTO_MIN_BYTES = 150 * 1024;
      const PHOTO_MAX_BYTES = 220 * 1024;
      if (bytes.length < PHOTO_MIN_BYTES || bytes.length > PHOTO_MAX_BYTES) {
        return json_({ ok:false, error:'Photo must be between 150KB and 200KB. Please resize and try again.' });
      }
      const folder = DriveApp.getFolderById(getDriveFolderId_());
      const blob = Utilities.newBlob(bytes, body.photoMimeType || 'image/jpeg', body.photoName || 'headshot.jpg');
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      sheet.getRange(rowNum, idx.HeadshotURL + 1).setValue('https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000');
    }
    ['instagram','twitter','tiktok','youtube','facebook'].forEach(f => {
      if (body[f] !== undefined) sheet.getRange(rowNum, idx[ACTOR_FIELD_MAP[f]] + 1).setValue(body[f]);
    });
    return json_({ ok:true });
  }

  if (action === 'submitBrief') {
    return handleSubmitBrief_(body);
  }

  if (action === 'adminSendShortlist') {
    if (body.password !== getAdminPassword_()) return json_({ ok:false, error:'Unauthorized' });
    return handleSendShortlist_(body);
  }

  return json_({ ok:false, error:'Unknown action' });
}

// ---------- Casting brief intake, matching, notification ----------
function handleSubmitBrief_(body){
  const bSheet = briefsSheet_();
  const bData = bSheet.getDataRange().getValues();
  const bIdx = headerIndex_(bData[0]);

  const email = (body.producerEmail || '').trim().toLowerCase();
  const company = (body.companyName || '').trim().toLowerCase();
  if (!company) return json_({ ok:false, error:'Company or production house name is required.' });

  const country = (body.country || '').trim();
  const taxPin = (body.taxPin || '').trim();
  const isZambian = country.toLowerCase() === 'zambia';
  if (isZambian) {
    if (!taxPin) return json_({ ok:false, error:'ZRA TPIN is required for Zambian companies.' });
    if (!/^\d{8,12}$/.test(taxPin)) return json_({ ok:false, error:'ZRA TPIN should be numeric only.' });
  }

  const priorCount = bData.slice(1).filter(r => {
    const rEmail = (r[bIdx.ProducerEmail] || '').trim().toLowerCase();
    const rCompany = (r[bIdx.CompanyName] || '').trim().toLowerCase();
    const rTpin = (r[bIdx.TaxPin] || '').trim();
    return rEmail === email || rCompany === company || (taxPin && rTpin === taxPin);
  }).length;
  const visitNumber = priorCount + 1;
  const pricingTier = visitNumber <= 2 ? 'Free' : 'Paid';

  const briefId = nextId_(bData, bIdx.BriefID, 'BRF-', 4);

  // Match against active, approved actors
  const aSheet = actorsSheet_();
  const aData = aSheet.getDataRange().getValues();
  const aIdx = headerIndex_(aData[0]);
  const actors = aData.slice(1)
    .map(r => rowToActor_(r, aIdx))
    .filter(a => a.status === 'Active' && a.admissionStatus === 'Approved');
  const shortlistIds = matchActors_(body, actors);

  const row = BRIEF_HEADERS.map(h => '');
  const set = (h, v) => row[bIdx[h]] = v;
  set('BriefID', briefId);
  set('ProducerEmail', body.producerEmail || '');
  set('CompanyName', body.companyName || '');
  set('Country', country);
  set('TaxPin', taxPin);
  set('ProducerName', body.producerName || '');
  set('ProductionTitle', body.productionTitle || '');
  set('Director', body.director || '');
  set('ContactPerson', body.contactPerson || '');
  set('CharacterName', body.characterName || '');
  set('AgeRange', body.ageRange || '');
  set('RoleGender', body.roleGender || '');
  set('CharacterDescription', body.characterDescription || '');
  set('Language', body.language || '');
  set('Accent', body.accent || '');
  set('PhysicalRequirements', body.physicalRequirements || '');
  set('ActingRequirements', body.actingRequirements || '');
  set('SpecialSkillsNeeded', body.specialSkillsNeeded || '');
  set('ProductionType', body.productionType || '');
  set('ShootDates', body.shootDates || '');
  set('Location', body.location || '');
  set('NumberOfDays', body.numberOfDays || '');
  set('Compensation', body.compensation || '');
  set('AuditionRequirements', body.auditionRequirements || '');
  set('Deadline', body.deadline || '');
  set('VisitNumber', visitNumber);
  set('PricingTier', pricingTier);
  set('Status', 'New');
  set('ShortlistIDs', shortlistIds.join(','));
  set('SubmittedDate', new Date().toISOString());
  bSheet.appendRow(row);

  notifyAdminOfBrief_(briefId, body, visitNumber, pricingTier, shortlistIds);

  return json_({ ok:true, briefId: briefId, visitNumber: visitNumber, pricingTier: pricingTier });
}

function parseAgeRange_(str){
  if (!str) return null;
  const m = String(str).match(/(\d{1,3})\s*(?:-|to)\s*(\d{1,3})/i);
  if (m) return { min: parseInt(m[1]), max: parseInt(m[2]) };
  const single = String(str).match(/(\d{1,3})/);
  if (single) { const n = parseInt(single[1]); return { min: n-3, max: n+3 }; }
  return null;
}

function matchActors_(brief, actors){
  const range = parseAgeRange_(brief.ageRange);
  const scored = actors.map(a => {
    let score = 0;
    if (brief.roleGender && a.gender && brief.roleGender.trim().toLowerCase() === a.gender.trim().toLowerCase()) score += 3;
    if (brief.language && a.languages && a.languages.toLowerCase().includes(brief.language.toLowerCase())) score += 2;
    if (brief.accent && a.accents && a.accents.toLowerCase().includes(brief.accent.toLowerCase())) score += 1;
    if (range && a.castingAge) {
      const age = parseInt(a.castingAge);
      if (!isNaN(age) && age >= range.min && age <= range.max) score += 3;
    }
    const desc = ((brief.characterDescription || '') + ' ' + (brief.actingRequirements || '')).toLowerCase();
    (a.category || '').split(',').forEach(c => { c = c.trim().toLowerCase(); if (c && desc.includes(c)) score += 1; });
    return { id: a.id, score };
  });
  return scored.filter(x => x.score > 0).sort((a,b) => b.score - a.score).slice(0, 8).map(x => x.id);
}

function notifyAdminOfBrief_(briefId, body, visitNumber, pricingTier, shortlistIds){
  const adminEmail = getAdminEmail_();
  if (!adminEmail) return;
  const siteUrl = getSiteUrl_();
  const lines = [
    'New casting brief received: ' + briefId,
    '',
    'Producer: ' + (body.producerName || '') + ' — ' + (body.companyName || '') + ' (' + (body.producerEmail || '') + ')',
    'Country: ' + (body.country || '') + (body.taxPin ? ' — TPIN: ' + body.taxPin : ''),
    'Visit number: ' + visitNumber + ' (' + pricingTier + ')',
    'Production: ' + (body.productionTitle || ''),
    'Role: ' + (body.characterName || '') + ', ' + (body.ageRange || '') + ', ' + (body.roleGender || ''),
    'Description: ' + (body.characterDescription || ''),
    '',
    'Auto-matched shortlist (' + shortlistIds.length + '): ' + (shortlistIds.join(', ') || 'No strong matches found'),
    '',
    'Review and send from the admin console: ' + siteUrl + 'admin.html'
  ];
  try {
    MailApp.sendEmail(adminEmail, 'JPL Casting Brief — ' + (body.productionTitle || briefId), lines.join('\n'));
  } catch (err) {
    // The brief is already saved — don't let a notification failure look like a failed submission.
    Logger.log('notifyAdminOfBrief_ failed: ' + err);
  }
}

function handleSendShortlist_(body){
  const bSheet = briefsSheet_();
  const bData = bSheet.getDataRange().getValues();
  const bIdx = headerIndex_(bData[0]);
  let rowNum = -1, briefRow = null;
  for (let i = 1; i < bData.length; i++) { if (bData[i][bIdx.BriefID] === body.briefId){ rowNum = i+1; briefRow = bData[i]; break; } }
  if (rowNum === -1) return json_({ ok:false, error:'Brief not found' });

  const ids = (body.actorIds || []).length ? body.actorIds : (briefRow[bIdx.ShortlistIDs] || '').split(',').filter(Boolean);
  const siteUrl = getSiteUrl_();
  const aSheet = actorsSheet_();
  const aData = aSheet.getDataRange().getValues();
  const aIdx = headerIndex_(aData[0]);
  const actors = aData.slice(1).map(r => rowToActor_(r, aIdx)).filter(a => ids.includes(a.id));

  const lines = [
    'Hello ' + (briefRow[bIdx.ProducerName] || '') + ',',
    '',
    'Thank you for your casting brief for "' + (briefRow[bIdx.ProductionTitle] || '') + '." Here is a curated shortlist from the JPL roster:',
    ''
  ];
  actors.forEach(a => lines.push('• ' + a.name + ' (' + a.id + ') — ' + siteUrl + 'actor.html?id=' + a.id));
  lines.push('', 'For casting enquiries and next steps, reply to this email or reach us on WhatsApp at +260 977 858 275.', '', 'Joelhood Pictures Limited');

  if (briefRow[bIdx.ProducerEmail]) {
    try {
      MailApp.sendEmail(briefRow[bIdx.ProducerEmail], 'JPL Casting Shortlist — ' + (briefRow[bIdx.ProductionTitle] || ''), lines.join('\n'));
    } catch (err) {
      return json_({ ok:false, error:'Email did not send — check that Mail permission is authorized for this script.' });
    }
  }
  bSheet.getRange(rowNum, bIdx.Status + 1).setValue('Sent');
  bSheet.getRange(rowNum, bIdx.ShortlistIDs + 1).setValue(ids.join(','));
  return json_({ ok:true });
}
