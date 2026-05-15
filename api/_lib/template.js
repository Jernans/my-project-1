export function subject(phone, opts = {}) {
  return opts.subject || 'Question about WhatsApp for Android';
}

function digitsOnly(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function inferCCode(pn) {
  // Keep the support-info style: country code + remaining number.
  // Works for most E.164 numbers because the bot only needs natural-looking Support Info.
  const known = ['1','7','20','27','30','31','32','33','34','36','39','40','41','43','44','45','46','47','48','49','51','52','53','54','55','56','57','58','60','61','62','63','64','65','66','81','82','84','86','90','91','92','93','94','95','98','212','213','216','218','220','221','222','223','224','225','226','227','228','229','230','231','232','233','234','235','236','237','238','239','240','241','242','243','244','245','246','248','249','250','251','252','253','254','255','256','257','258','260','261','262','263','264','265','266','267','268','269','290','291','297','298','299','350','351','352','353','354','355','356','357','358','359','370','371','372','373','374','375','376','377','378','380','381','382','383','385','386','387','389','420','421','423','500','501','502','503','504','505','506','507','508','509','590','591','592','593','594','595','596','597','598','599','670','672','673','674','675','676','677','678','679','680','681','682','683','685','686','687','688','689','690','691','692','850','852','853','855','856','880','886','960','961','962','963','964','965','966','967','968','970','971','972','973','974','975','976','977','992','993','994','995','996','998'];
  const code = known.find(c => pn.startsWith(c)) || pn.slice(0, Math.max(1, pn.length - 9));
  return `${code} ${pn.slice(code.length)}`.trim();
}

function replaceNumberFields(raw, phone) {
  const pn = digitsOnly(phone);
  const ccode = inferCCode(pn);

  let out = String(raw || '').trim();

  // Replace CCode and pn only. Keep the rest exactly like the original Support Info.
  out = out.replace(/CCode:\s*[^\n\r]*/i, `CCode: ${ccode}`);
  out = out.replace(/pn:\s*[^\n\r]*/i, `pn: ${pn}`);

  // If missing, append fields in app-like format.
  if (!/CCode:/i.test(out)) out += `\nCCode: ${ccode}`;
  if (!/pn:/i.test(out)) out += `\npn: ${pn}`;

  return out;
}

const DEFAULT_SUPPORT_INFO_BASE = `--Support Info--
App: com.whatsapp.w4b
Architecture: aarch64
AutoConf status: autoconf_server_enabled
Board: fire
Build: Redmi/fire_id/fire:15/AP3A.240905.015.A2/OS2.0.202.0.VMXIDXM:user/release-keys
CCode: 218 930570429
CPU ABI: arm64-v8a
Carrier: by.U
Description: 2.26.15.72
Device: fire
Device ID: 0
Device ISO8601: 2026-05-15 15:34:21.845+0700
Email OTP status: email_otp_not_eligible
Embeddings Index: state: NOT_STARTED, progress: 0, finished: --, last updated: --
FAQ Results Read: 10
FAQ Results Returned: 10
Is Foldable: false
Is Tablet: false
Kernel: Unknown release unknown version
LC: IN
LG: af
Manufacturer: Xiaomi
Missing Permissions: android.permission.CAMERA, android.permission.RECORD_AUDIO, android.permission.READ_EXTERNAL_STORAGE, android.permission.ACCESS_COARSE_LOCATION, android.permission.ACCESS_FINE_LOCATION, android.permission.NEARBY_WIFI_DEVICES, android.permission.BLUETOOTH_CONNECT, android.permission.SCHEDULE_EXACT_ALARM, android.permission.WRITE_EXTERNAL_STORAGE, android.permission.CALL_PHONE, android.permission.ACCESS_MEDIA_LOCATION, android.permission.INSTALL_SHORTCUT, android.permission.READ_PHONE_NUMBERS, android.permission.READ_PHONE_STATE, android.permission.SEND_SMS, android.permission.REQUEST_INSTALL_PACKAGES, com.sec.android.provider.badge.permission.READ, com.sec.android.provider.badge.permission.WRITE, com.htc.launcher.permission.READ_SETTINGS, com.htc.launcher.permission.UPDATE_SHORTCUT, com.sonyericsson.home.permission.BROADCAST_BADGE, com.sonymobile.home.permission.PROVIDER_INSERT_BADGE, com.huawei.android.launcher.permission.READ_SETTINGS, com.huawei.android.launcher.permission.WRITE_SETTINGS, com.huawei.android.launcher.permission.CHANGE_BADGE, android.permission.ANSWER_PHONE_CALLS, android.permission.READ_CALL_LOG
Model: 23053RN02A
Network Type: U.N.K.N.O.W.N.
OS: 15
PSI abprops:: , semantic_search_enabled:false
Phone Type: G.S.M.
Primary flash call status: primary_eligible
Product: fire_id
Radio MCC-MNC: 510-10
SIM MCC-MNC: 510-10
Target: release
Version: 2.26.15.72
Debug info: unregistered
MDEnabled: true
Status Infra migration state:: readEnabled: false, writeEnabled: false, sendEnabled: false, recvEnabled: false
HasMdCompanion: false
Context: deeplink/support
useragent: WhatsApp/[2.26.15.72](http://2.26.15.72/) SMBA/15 Device/Xiaomi-23053RN02A
Socket Conn: DN
Free Space Built-In: 17603518464 (17,60 GB)
Free Space Removable: 17603518464 (17,60 GB)
Smb count: 16
Ent count: 3
Connection: M.O.B.I.L.E. (L.T.E.)
Diagnostic Codes: FE-GDE FE-GDC FE-VIDC FE-SMSRTV
Sim: null 5
Network metered: 930:true;933:true
Network restricted: 930:false;933:false
Data roaming: false
Tel roaming: false
ABprops hash state: unregistered
Serverprops hash state: unregistered
anid: f729f707-9fa9-40d7-8c44-e7fe7ec33f51
XPMigrated: no
i2aAttempted: false
Datacenter: odn
Screen reader: false
Fingerprint eligible: true
Last local backup time: never
Google account added: false
Groups media visibility: default
Individual media visibility: default
In scoped mode: true
Has unexpected .nomedia: false
Is Companion: false
Has Wear OS Companion: false
saga_copy: true
pn: 218930570429`;

export function buildSupportInfo({ phone, rawSupportInfo = '' }) {
  // If user sends Support Info manually, keep it raw but sync only CCode and pn.
  if (rawSupportInfo && rawSupportInfo.includes('--Support Info--')) {
    return replaceNumberFields(rawSupportInfo, phone);
  }

  // Default: use user's proven Support Info base and sync only CCode/pn.
  return replaceNumberFields(DEFAULT_SUPPORT_INFO_BASE, phone);
}

export function message(phone, opts = {}) {
  const supportInfo = buildSupportInfo({
    phone,
    rawSupportInfo: opts.rawSupportInfo || ''
  });

  return `Hello WhatsApp Support,

I am experiencing an issue logging into my WhatsApp account. I received the message “Login not available right now” due to security reasons.

I would like to inform you that:
- My phone number is still active and accessible
- The SIM card is inserted in this device
- I am the legitimate owner of this number

I have not engaged in any suspicious activity, but suddenly I am unable to log in. Please help me restore access to my account.

Here are my phone number details:
${phone}

${supportInfo}`;
}
