import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'sl';

type Translations = {
  [key: string]: {
    en: string;
    sl: string;
  };
};

const translations: Translations = {
  // Common
  'common.signIn': { en: 'Sign In', sl: 'Prijava' },
  'common.signOut': { en: 'Sign Out', sl: 'Odjava' },
  'common.email': { en: 'Email', sl: 'E-pošta' },
  'common.password': { en: 'Password', sl: 'Geslo' },
  'common.loading': { en: 'Loading...', sl: 'Nalaganje...' },
  'common.save': { en: 'Save', sl: 'Shrani' },
  'common.cancel': { en: 'Cancel', sl: 'Prekliči' },
  'common.delete': { en: 'Delete', sl: 'Izbriši' },
  'common.edit': { en: 'Edit', sl: 'Uredi' },
  'common.search': { en: 'Search', sl: 'Iskanje' },
  'common.filter': { en: 'Filter', sl: 'Filter' },
  'common.export': { en: 'Export', sl: 'Izvozi' },
  'common.confirm': { en: 'Confirm', sl: 'Potrdi' },

  // Member Portal
  'member.login.title': { en: 'Sign In to Your Account', sl: 'Prijavite se v svoj račun' },
  'member.login.rememberMe': { en: 'Remember me', sl: 'Zapomni si me' },
  'member.login.forgotPassword': { en: 'Forgot your password?', sl: 'Ste pozabili geslo?' },
  'member.login.notMember': { en: 'Not a member yet?', sl: 'Še niste član?' },
  'member.login.registerHere': { en: 'Register here', sl: 'Registrirajte se tukaj' },
  'member.login.fillRequired': {
    en: 'Please enter your email and password.',
    sl: 'Vnesite e-pošto in geslo.',
  },
  'member.login.invalidEmail': {
    en: 'Please enter a valid email address.',
    sl: 'Vnesite veljaven e-poštni naslov.',
  },

  'member.register.title': { en: 'Join the Maestro Loyalty Program', sl: 'Pridružite se programu zvestobe Maestro' },
  'member.register.firstName': { en: 'First Name', sl: 'Ime' },
  'member.register.lastName': { en: 'Last Name', sl: 'Priimek' },
  'member.register.address': { en: 'Home Address', sl: 'Domači naslov' },
  'member.register.confirmPassword': { en: 'Confirm Password', sl: 'Potrdite geslo' },
  'member.register.agreeTerms': { en: 'I agree to the Terms and Conditions', sl: 'Strinjam se s pogoji uporabe' },
  'member.register.marketingConsent': { en: 'I consent to marketing communications', sl: 'Soglašam s tržnim komuniciranjem' },
  'member.register.createAccount': { en: 'Create Account', sl: 'Ustvari račun' },
  'member.register.alreadyMember': { en: 'Already a member?', sl: 'Ste že član?' },

  'member.dashboard.title': { en: 'Dashboard', sl: 'Nadzorna plošča' },
  'member.dashboard.currentPoints': { en: 'Current Points', sl: 'Trenutne točke' },
  'member.dashboard.status': { en: 'Status', sl: 'Status' },
  'member.dashboard.nextTier': { en: 'away from', sl: 'do' },
  'member.dashboard.redeemPoints': { en: 'Redeem Points', sl: 'Unovči točke' },
  'member.dashboard.viewPurchases': { en: 'View Purchases', sl: 'Preglej nakupe' },
  'member.dashboard.recentPurchases': { en: 'Recent Purchases', sl: 'Nedavni nakupi' },
  'member.dashboard.loyaltyCard': { en: 'Loyalty Card', sl: 'Kartica zvestobe' },

  'member.purchases.title': { en: 'Purchase History', sl: 'Zgodovina nakupov' },
  'member.purchases.month': { en: 'Month', sl: 'Mesec' },
  'member.purchases.amount': { en: 'Total Amount (EUR)', sl: 'Skupni znesek (EUR)' },
  'member.purchases.pointsEarned': { en: 'Points Earned', sl: 'Pridobljene točke' },
  'member.purchases.statusAtTime': { en: 'Status at Time', sl: 'Status takrat' },

  'member.rewards.title': { en: 'Rewards Catalog', sl: 'Katalog nagrad' },
  'member.rewards.redeem': { en: 'Redeem', sl: 'Unovči' },
  'member.rewards.notEnoughPoints': { en: 'Not enough points', sl: 'Premalo točk' },
  'member.rewards.pointsRequired': { en: 'points required', sl: 'potrebnih točk' },

  // Admin Portal
  'admin.login.title': { en: 'Administration Portal', sl: 'Administratorski portal' },
  'admin.dashboard.title': { en: 'Admin Dashboard', sl: 'Admin Nadzorna plošča' },
  'admin.dashboard.activeMembers': { en: 'Active Members', sl: 'Aktivni člani' },
  'admin.dashboard.pointsIssued': { en: 'Points Issued This Month', sl: 'Izdane točke ta mesec' },
  'admin.dashboard.rewardsRedeemed': { en: 'Rewards Redeemed', sl: 'Unovčene nagrade' },

  'admin.customers.title': { en: 'Customer Overview', sl: 'Pregled strank' },
  'admin.customers.memberID': { en: 'Member ID', sl: 'ID člana' },
  'admin.customers.fullName': { en: 'Full Name', sl: 'Polno ime' },
  'admin.customers.currentStatus': { en: 'Current Status', sl: 'Trenutni status' },
  'admin.customers.pointsBalance': { en: 'Points Balance', sl: 'Stanje točk' },
  'admin.customers.lastPurchase': { en: 'Last Purchase', sl: 'Zadnji nakup' },
  'admin.customers.registrationDate': { en: 'Registration Date', sl: 'Datum registracije' },

  'admin.rewards.title': { en: 'Rewards Management', sl: 'Upravljanje nagrad' },
  'admin.rewards.addNew': { en: 'Add New Reward', sl: 'Dodaj novo nagrado' },
  'admin.rewards.name': { en: 'Reward Name', sl: 'Ime nagrade' },
  'admin.rewards.category': { en: 'Category', sl: 'Kategorija' },
  'admin.rewards.stock': { en: 'Stock', sl: 'Zaloga' },
  'admin.rewards.active': { en: 'Active', sl: 'Aktivna' },
  'admin.rewards.inactive': { en: 'Inactive', sl: 'Neaktivna' },

  'admin.rules.title': { en: 'Loyalty Rules Management', sl: 'Upravljanje pravil zvestobe' },
  'admin.rules.statusRules': { en: 'Status Transition Rules', sl: 'Pravila prehoda statusov' },
  'admin.rules.pointsTable': { en: 'Points Calculation Table', sl: 'Tabela izračuna točk' },

  'admin.sql.title': { en: 'Advanced SQL Queries', sl: 'Napredne SQL poizvedbe' },
  'admin.sql.warning': { en: 'This interface provides direct database access. Use with caution.', sl: 'Ta vmesnik omogoča neposreden dostop do baze. Uporabljajte previdno.' },
  'admin.sql.runQuery': { en: 'Run Query', sl: 'Izvedi poizvedbo' },

  'admin.audit.title': { en: 'Audit Log', sl: 'Revizijska sled' },
  'admin.audit.timestamp': { en: 'Timestamp', sl: 'Čas' },
  'admin.audit.eventType': { en: 'Event Type', sl: 'Tip dogodka' },
  'admin.audit.affectedMember': { en: 'Affected Member', sl: 'Prizadeti član' },
  'admin.audit.performedBy': { en: 'Performed By', sl: 'Izvedel' },
  'admin.audit.description': { en: 'Description', sl: 'Opis' },
  'admin.audit.oldValue': { en: 'Old Value', sl: 'Stara vrednost' },
  'admin.audit.newValue': { en: 'New Value', sl: 'Nova vrednost' },
  'admin.audit.noEvents': { en: 'No audit events found.', sl: 'Ni najdenih dogodkov.' },
  'admin.audit.subtitle': { en: 'Full history of all significant system events', sl: 'Popolna zgodovina vseh pomembnih dogodkov v sistemu' },
  'admin.audit.allEventTypes': { en: 'All Event Types', sl: 'Vsi tipi dogodkov' },
  'admin.audit.event.Status Change': { en: 'Status Change', sl: 'Sprememba statusa' },
  'admin.audit.event.Points Awarded': { en: 'Points Awarded', sl: 'Dodeljene točke' },
  'admin.audit.event.Points Redeemed': { en: 'Points Redeemed', sl: 'Unovčene točke' },
  'admin.audit.event.Rule Change': { en: 'Rule Change', sl: 'Sprememba pravila' },
  'admin.audit.event.Admin Action': { en: 'Admin Action', sl: 'Ukrepanje administratorja' },
  'admin.audit.event.Login': { en: 'Login', sl: 'Prijava' },
  'admin.audit.searchPlaceholder': { en: 'Search events...', sl: 'Iskanje dogodkov...' },
  'admin.audit.aboutTitle': { en: 'About the Audit Log', sl: 'O revizijski sledi' },
  'admin.audit.aboutText': {
    en: 'This audit log records all significant system events including status changes, points transactions, rule modifications, and administrative actions. All events are timestamped and include information about who performed the action. This log is read-only and cannot be modified.',
    sl: 'Revizijska sled beleži vse pomembne dogodke v sistemu, vključno s spremembami statusa, transakcijami točk, spremembami pravil in administratorskimi ukrepi. Vsak dogodek ima časovni žig in podatek o izvajalcu. Dnevnik je samo za branje in ga ni mogoče spreminjati.',
  },
  'admin.audit.system': { en: 'System', sl: 'Sistem' },
  'admin.audit.allMembers': { en: 'All members', sl: 'Vsi člani' },
  'admin.audit.desc.tierUpgradeBronzeSilver': {
    en: 'Tier upgraded from Bronze to Silver',
    sl: 'Nivo nadgrajen iz bronastega v srebrnega',
  },
  'admin.audit.desc.redeemedWeekendGetaway': {
    en: 'Redeemed reward: Weekend Getaway',
    sl: 'Unovčena nagrada: Vikend pobeg',
  },
  'admin.audit.desc.monthlyPointsCalculation': {
    en: 'Monthly points calculation completed',
    sl: 'Mesečni izračun točk zaključen',
  },
  'admin.audit.desc.silverThresholdUpdated': {
    en: 'Silver tier threshold updated',
    sl: 'Posodobljen prag srebrnega nivoja',
  },
  'admin.audit.desc.manualPointsCorrection': {
    en: 'Manual points correction applied',
    sl: 'Uporabljena ročna korekcija točk',
  },
  'admin.audit.desc.adminLoginSuccess': {
    en: 'Admin login successful',
    sl: 'Uspešna prijava administratorja',
  },
  'admin.audit.desc.tierDowngradeBronzeBasic': {
    en: 'Tier downgraded from Bronze to Basic',
    sl: 'Nivo znižan iz bronastega v osnovni',
  },
  'admin.audit.desc.redeemedPremiumHeadphones': {
    en: 'Redeemed reward: Premium Headphones',
    sl: 'Unovčena nagrada: Premium slušalke',
  },
  'admin.audit.desc.erpImportApril': {
    en: 'Imported purchase data from ERP for April 2026',
    sl: 'Uvoz podatkov o nakupih iz ERP za april 2026',
  },
  'admin.audit.desc.erpImportReverted': {
    en: 'Reverted ERP import — April 2026 data removed',
    sl: 'Razveljavljen ERP uvoz — aprilski podatki odstranjeni',
  },
  'admin.audit.desc.tierChangeErp': {
    en: 'Member tier changed after ERP import billing',
    sl: 'Status člana spremenjen po ERP uvozu in obračunu',
  },
  'admin.audit.desc.tierRevertedErp': {
    en: 'Member tier restored after reverting ERP import',
    sl: 'Status člana obnovljen po razveljavitvi ERP uvoza',
  },
  'admin.audit.desc.pointsAwardedErp': {
    en: 'Loyalty points awarded after ERP import billing',
    sl: 'Točke dodeljene po ERP uvozu in obračunu',
  },
  'admin.audit.desc.pointsRevertedErp': {
    en: 'Loyalty points removed after reverting ERP import',
    sl: 'Točke odstranjene po razveljavitvi ERP uvoza',
  },
  'admin.audit.desc.statusRuleUpdated': {
    en: 'Status transition rule updated',
    sl: 'Posodobljeno pravilo prehoda statusa',
  },
  'admin.audit.desc.pointsRuleUpdated': {
    en: 'Points calculation rule updated',
    sl: 'Posodobljeno pravilo izračuna točk',
  },
  'admin.audit.val.points5200': { en: '5200 points', sl: '5200 točk' },
  'admin.audit.val.points200': { en: '200 points', sl: '200 točk' },
  'admin.audit.val.points45230Issued': { en: '45,230 points issued', sl: '45.230 izdanih točk' },
  'admin.audit.val.eur2500': { en: '2500 EUR', sl: '2500 EUR' },
  'admin.audit.val.eur3000': { en: '3000 EUR', sl: '3000 EUR' },
  'admin.audit.val.points1000': { en: '1000 points', sl: '1000 točk' },
  'admin.audit.val.points1200': { en: '1200 points', sl: '1200 točk' },
  'admin.audit.val.points3800': { en: '3800 points', sl: '3800 točk' },
  'admin.audit.val.points1300': { en: '1300 points', sl: '1300 točk' },
  'admin.rules.history.silverThreshold': { en: 'Silver Threshold', sl: 'Prag srebrnega nivoja' },
  'admin.rules.history.goldPointsOver1000': { en: 'Gold Points (Over 1000 EUR)', sl: 'Zlati točke (nad 1000 EUR)' },
  'admin.rules.history.bronzeConsecutiveMonths': { en: 'Bronze Consecutive Months', sl: 'Zaporedni meseci bronastega nivoja' },

  // Tiers
  'tier.Basic': { en: 'Basic', sl: 'Osnovni' },
  'tier.Bronze': { en: 'Bronze', sl: 'Bronasti' },
  'tier.Silver': { en: 'Silver', sl: 'Srebrni' },
  'tier.Gold': { en: 'Gold', sl: 'Zlati' },

  // Reward categories
  'category.Gift cards': { en: 'Gift cards', sl: 'Darilne kartice' },
  'category.Discounts': { en: 'Discounts', sl: 'Popusti' },
  'category.Experiences': { en: 'Experiences', sl: 'Izkušnje' },
  'category.Gift Cards': { en: 'Gift Cards', sl: 'Darilne kartice' },
  'category.all': { en: 'All Categories', sl: 'Vse kategorije' },

  // Admin dashboard & charts
  'admin.dashboard.subtitle': { en: 'Overview of loyalty program performance', sl: 'Pregled uspešnosti programa zvestobe' },
  'admin.dashboard.goldMembers': { en: 'Gold Members', sl: 'Zlati člani' },
  'admin.dashboard.chartMonthly': { en: 'Monthly Purchase Totals (Last 12 Months)', sl: 'Mesečni zneski nakupov (zadnjih 12 mesecev)' },
  'admin.dashboard.chartTierDist': { en: 'Member Distribution by Tier', sl: 'Razporeditev članov po nivojih' },
  'admin.dashboard.purchaseVolume': { en: 'Purchase volume (all time)', sl: 'Obseg nakupov (skupaj)' },
  'admin.dashboard.runBilling': { en: 'Run Monthly Recalculation', sl: 'Zaženi mesečni obračun' },
  'admin.dashboard.viewCustomers': { en: 'View All Customers', sl: 'Prikaži vse člane' },
  'chart.month': { en: 'Month', sl: 'Mesec' },
  'chart.amount': { en: 'Amount', sl: 'Znesek' },
  'chart.members': { en: 'Members', sl: 'Člani' },

  // Admin customers
  'admin.customers.subtitle': { en: 'Search, filter, and review member data and loyalty statuses', sl: 'Iskanje, filtriranje in pregled podatkov članov' },
  'admin.customers.allStatuses': { en: 'All Statuses', sl: 'Vsi statusi' },
  'admin.customers.actions': { en: 'Actions', sl: 'Dejanja' },
  'admin.customers.viewDetails': { en: 'View Details', sl: 'Podrobnosti' },
  'admin.customers.noResults': { en: 'No customers found matching your criteria.', sl: 'Ni članov, ki ustrezajo iskanju.' },
  'admin.customers.memberDetails': { en: 'Member Details', sl: 'Podrobnosti člana' },
  'admin.customers.personalInfo': { en: 'Personal Information', sl: 'Osebni podatki' },
  'admin.customers.statusHistory': { en: 'Status History', sl: 'Zgodovina statusov' },
  'admin.customers.purchaseHistory': { en: 'Recent Purchase History', sl: 'Nedavna zgodovina nakupov' },
  'admin.customers.date': { en: 'Date', sl: 'Datum' },
  'admin.customers.previousStatus': { en: 'Previous Status', sl: 'Prejšnji status' },
  'admin.customers.newStatus': { en: 'New Status', sl: 'Novi status' },
  'admin.customers.reason': { en: 'Reason', sl: 'Razlog' },
  'admin.customers.close': { en: 'Close', sl: 'Zapri' },
  'admin.customers.manualPoints': { en: 'Manual Points Correction', sl: 'Ročna korekcija točk' },
  'admin.customers.pointsHistory': { en: 'Points History', sl: 'Zgodovina točk' },
  'admin.customers.pointsAdjustment': { en: 'Points adjustment (+/-)', sl: 'Sprememba točk (+/-)' },
  'admin.customers.correctionReason': { en: 'Reason (required)', sl: 'Razlog (obvezno)' },
  'admin.customers.applyCorrection': { en: 'Apply correction', sl: 'Uporabi korekcijo' },
  'admin.customers.correctionSuccess': { en: 'Points updated successfully', sl: 'Točke uspešno posodobljene' },
  'admin.customers.current': { en: 'Current', sl: 'Trenutno' },
  'admin.import.title': { en: 'ERP Import', sl: 'ERP uvoz' },
  'admin.import.subtitle': {
    en: 'Simulate April ERP import — click again to undo tier and points changes',
    sl: 'Simulacija aprilskega ERP uvoza — ponovni klik razveljavi spremembe statusa in točk',
  },
  'admin.import.trigger': { en: 'Run ERP Import', sl: 'Zaženi ERP uvoz' },
  'admin.import.running': { en: 'Processing...', sl: 'Obdelava...' },
  'admin.import.lastRun': { en: 'Last import', sl: 'Zadnji uvoz' },
  'admin.import.records': { en: 'Records processed', sl: 'Obdelanih zapisov' },
  'admin.import.errors': { en: 'Errors', sl: 'Napake' },
  'admin.import.none': { en: 'No import has been run yet', sl: 'Uvoz še ni bil zagnan' },
  'admin.import.status.success': { en: 'Success', sl: 'Uspešno' },
  'admin.import.status.partial': { en: 'Partial', sl: 'Delno' },
  'admin.import.status.failed': { en: 'Failed', sl: 'Neuspešno' },
  'admin.import.status.idle': { en: 'Idle', sl: 'Nedejaven' },
  'admin.import.status.reverted': { en: 'Reverted', sl: 'Razveljavljeno' },
  'admin.import.reverted': {
    en: 'April import removed — member tiers and points restored',
    sl: 'Aprilski uvoz odstranjen — statusi in točke obnovljeni',
  },
  'admin.billing.trigger': { en: 'Run Monthly Billing', sl: 'Zaženi mesečni obračun' },
  'admin.billing.running': { en: 'Running billing...', sl: 'Zagon obračuna...' },
  'admin.billing.success': { en: 'Billing completed', sl: 'Obračun zaključen' },
  'admin.billing.failed': { en: 'Billing failed', sl: 'Obračun ni uspel' },
  'admin.customers.page': { en: 'Page', sl: 'Stran' },
  'admin.customers.of': { en: 'of', sl: 'od' },

  // Admin rules
  'admin.rules.subtitle': { en: 'Adjust loyalty tier thresholds and points values', sl: 'Prilagoditev pragov nivojev in vrednosti točk' },
  'admin.rules.important': { en: 'Important', sl: 'Pomembno' },
  'admin.rules.importantText': {
    en: 'Changing these rules will affect the next monthly recalculation. All changes are logged in the audit trail.',
    sl: 'Spremembe pravil vplivajo na naslednji mesečni obračun. Vse spremembe so zabeležene v revizijski sledi.',
  },
  'admin.rules.ruleDescription': { en: 'Rule Description', sl: 'Opis pravila' },
  'admin.rules.tier': { en: 'Tier', sl: 'Nivo' },
  'admin.rules.threshold': { en: 'Threshold Amount (EUR)', sl: 'Prag zneska (EUR)' },
  'admin.rules.consecutiveMonths': { en: 'Consecutive Months', sl: 'Zaporedni meseci' },
  'admin.rules.upTo200': { en: 'Up to €200', sl: 'Do 200 EUR' },
  'admin.rules.range200_1000': { en: '€200 - €1,000', sl: '200 - 1.000 EUR' },
  'admin.rules.over1000': { en: 'Over €1,000', sl: 'Nad 1.000 EUR' },
  'admin.rules.savePointsTable': { en: 'Save Points Table', sl: 'Shrani tabelo točk' },
  'admin.rules.changeHistory': { en: 'Change History', sl: 'Zgodovina sprememb' },
  'admin.rules.showHistory': { en: 'Show History', sl: 'Prikaži zgodovino' },
  'admin.rules.hideHistory': { en: 'Hide History', sl: 'Skrij zgodovino' },
  'admin.rules.editRule': { en: 'Edit Status Rule', sl: 'Uredi pravilo statusa' },
  'admin.rules.confirmChanges': { en: 'Confirm Changes', sl: 'Potrdi spremembe' },
  'admin.rules.confirmText': {
    en: 'Changing these rules will affect the next monthly recalculation. Are you sure you want to proceed?',
    sl: 'Spremembe vplivajo na naslednji mesečni obračun. Ali želite nadaljevati?',
  },
  'admin.rules.field': { en: 'Field', sl: 'Polje' },
  'admin.rules.changedBy': { en: 'Changed By', sl: 'Spremenil' },
  'admin.rules.rule.upgrade-bronze': { en: 'Upgrade to Bronze', sl: 'Napredovanje v Bronasto raven' },
  'admin.rules.rule.upgrade-silver': { en: 'Upgrade to Silver', sl: 'Napredovanje v Srebrno raven' },
  'admin.rules.rule.upgrade-gold': { en: 'Upgrade to Gold', sl: 'Napredovanje v Zlato raven' },
  'admin.rules.rule.downgrade-bronze': { en: 'Downgrade to Bronze', sl: 'Spuščanje v Bronasto raven' },
  'admin.rules.rule.reset-basic': { en: 'Reset to Basic', sl: 'Ponastavitev v Osnovni nivo' },
  'admin.rules.rule.maintain-silver': { en: 'Maintain Silver', sl: 'Ohranitev srebrnega nivoja' },
  'admin.rules.rule.maintain-gold': { en: 'Maintain Gold', sl: 'Ohranitev zlatega nivoja' },
  'admin.rules.rule.recover-bronze': { en: 'Recover from Bronze to Silver', sl: 'Obnova iz bronastega v srebrnega' },
  'admin.rules.bracket.upTo200': { en: 'Points up to €200', sl: 'Točke do 200 EUR' },
  'admin.rules.bracket.from200To1000': { en: 'Points €200–€1,000', sl: 'Točke 200–1.000 EUR' },
  'admin.rules.bracket.over1000': { en: 'Points over €1,000', sl: 'Točke nad 1.000 EUR' },
  'admin.rules.savedStatus': { en: 'Status rule saved', sl: 'Pravilo statusa shranjeno' },
  'admin.rules.savedPoints': { en: 'Points table saved', sl: 'Tabela točk shranjena' },
  'admin.rules.loadFailed': { en: 'Failed to load rules', sl: 'Nalaganje pravil ni uspelo' },
  'admin.rules.saveFailed': { en: 'Failed to save changes', sl: 'Shranjevanje sprememb ni uspelo' },
  'admin.rules.noChanges': { en: 'No changes to save', sl: 'Ni sprememb za shranjevanje' },

  // Admin SQL
  'admin.sql.subtitle': { en: 'Execute custom database queries for advanced analytics', sl: 'Izvedba poizvedb za napredno analitiko' },
  'admin.sql.savedQueries': { en: 'Saved Queries', sl: 'Shranjene poizvedbe' },
  'admin.sql.queryEditor': { en: 'Query Editor', sl: 'Urejevalnik poizvedb' },
  'admin.sql.running': { en: 'Running...', sl: 'Izvajanje...' },
  'admin.sql.placeholder': { en: 'Enter your SELECT query here...', sl: 'Vnesite SELECT poizvedbo...' },
  'admin.sql.queryError': { en: 'Query Error', sl: 'Napaka poizvedbe' },
  'admin.sql.results': { en: 'Query Results', sl: 'Rezultati poizvedbe' },
  'admin.sql.rows': { en: 'rows', sl: 'vrstic' },
  'admin.sql.executionTime': { en: 'Execution time', sl: 'Čas izvedbe' },
  'admin.sql.warningDetail': { en: 'All queries are logged in the audit trail. Only SELECT queries are allowed.', sl: 'Vse poizvedbe so zabeležene. Dovoljene so samo SELECT poizvedbe.' },
  'admin.sql.clear': { en: 'Clear', sl: 'Počisti' },
  'admin.sql.exportCsv': { en: 'Export to CSV', sl: 'Izvozi v CSV' },
  'admin.sql.showingResults': { en: 'Showing {count} results', sl: 'Prikazanih {count} rezultatov' },
  'admin.sql.queryExecuted': { en: 'Query executed in {ms}ms', sl: 'Poizvedba izvedena v {ms} ms' },
  'admin.sql.query.membersByTier': { en: 'Members by Tier', sl: 'Člani po nivojih' },
  'admin.sql.query.top10Active': { en: 'Top 10 Active Members', sl: '10 najbolj aktivnih članov' },
  'admin.sql.query.activeMembersCount': { en: 'Active Members Count', sl: 'Število aktivnih članov' },

  // Admin rewards mgmt
  'admin.rewards.subtitle': { en: 'Manage the rewards catalog', sl: 'Upravljanje kataloga nagrad' },
  'admin.rewards.pointsCost': { en: 'Points Cost', sl: 'Cena v točkah' },
  'admin.rewards.description': { en: 'Description', sl: 'Opis' },

  // Member pages
  'member.dashboard.welcome': { en: 'Welcome back', sl: 'Dobrodošli nazaj' },
  'member.dashboard.viewAll': { en: 'View All', sl: 'Prikaži vse' },
  'member.dashboard.noPurchases': { en: 'No purchases yet.', sl: 'Še ni nakupov.' },
  'member.dashboard.cardholder': { en: 'Cardholder', sl: 'Imetnik kartice' },
  'member.dashboard.cardStatus': { en: 'Status', sl: 'Status' },
  'member.profile.title': { en: 'My Profile', sl: 'Moj profil' },
  'member.profile.subtitle': { en: 'Update your personal information', sl: 'Posodobite osebne podatke' },
  'member.profile.personalInfo': { en: 'Personal Information', sl: 'Osebni podatki' },
  'member.profile.emailReadonly': { en: 'Email cannot be changed here.', sl: 'E-pošte tukaj ni mogoče spremeniti.' },
  'member.profile.saved': { en: 'Profile updated successfully', sl: 'Profil uspešno posodobljen' },
  'member.profile.saveFailed': { en: 'Failed to update profile', sl: 'Posodobitev profila ni uspela' },
  'member.profile.dangerZone': { en: 'Danger zone', sl: 'Nevarno območje' },
  'member.profile.deleteWarning': {
    en: 'Deleting your account deactivates your membership and anonymizes your personal data. Purchase history is kept for audit purposes.',
    sl: 'Izbris deaktivira članstvo in anonimizira osebne podatke. Zgodovina nakupov ostane za revizijo.',
  },
  'member.profile.deleteAccount': { en: 'Delete account', sl: 'Izbriši račun' },
  'member.profile.confirmDelete': { en: 'Delete account?', sl: 'Izbris računa?' },
  'member.profile.confirmDeleteText': {
    en: 'This action cannot be undone. You will be signed out immediately.',
    sl: 'Tega dejanja ni mogoče razveljaviti. Takoj boste odjavljeni.',
  },
  'member.profile.deleted': { en: 'Account deleted', sl: 'Račun izbrisan' },
  'member.profile.deleteFailed': { en: 'Failed to delete account', sl: 'Izbris računa ni uspel' },
  'member.dashboard.total': { en: 'Total', sl: 'Skupaj' },
  'member.purchases.subtitle': { en: 'View your monthly purchase totals and points earned', sl: 'Mesečni zneski nakupov in pridobljene točke' },
  'member.purchases.records': { en: 'Purchase Records', sl: 'Evidence nakupov' },
  'member.purchases.noResults': { en: 'No purchases found for the selected period.', sl: 'Za izbrano obdobje ni nakupov.' },
  'member.purchases.howCalculated': { en: 'How Points Are Calculated', sl: 'Kako se izračunajo točke' },
  'member.purchases.howCalculatedDesc': {
    en: 'Points are calculated based on your monthly purchase totals and your loyalty tier at the time of purchase. Higher tiers earn more points per euro spent. Points are automatically calculated and added at the end of each month.',
    sl: 'Točke se izračunajo na osnovi vaših mesečnih nakupov in statusa zvestobe ob času nakupa. Višji statusi prinesejo več točk na evro porabljenega denarja. Točke se samodejno izračunajo in dodelijo na koncu vsakega meseca.',
  },
  'member.purchases.prev': { en: 'Previous', sl: 'Prejšnja' },
  'member.purchases.next': { en: 'Next', sl: 'Naslednja' },
  'member.purchases.pageOf': { en: 'Page {page} of {total}', sl: 'Stran {page} od {total}' },
  'member.purchases.pending': { en: 'Pending', sl: 'V obdelavi' },
  'member.purchases.totalSpent': { en: 'Total spent', sl: 'Skupaj porabljeno' },
  'member.purchases.totalPoints': { en: 'Points earned', sl: 'Pridobljene točke' },
  'member.purchases.months': { en: 'Months', sl: 'Mesecev' },
  'member.rewards.availablePoints': { en: 'You have', sl: 'Na voljo imate' },
  'member.rewards.pointsAvailable': { en: 'points available', sl: 'točk' },
  'member.rewards.sortLowHigh': { en: 'Points: Low to High', sl: 'Točke: od najmanj' },
  'member.rewards.sortHighLow': { en: 'Points: High to Low', sl: 'Točke: od največ' },
  'member.rewards.noRewards': { en: 'No rewards currently available.', sl: 'Trenutno ni razpoložljivih nagrad.' },
  'member.rewards.confirmRedemption': { en: 'Confirm Redemption', sl: 'Potrdi unovčenje' },
  'member.rewards.pointsDeducted': { en: 'Points to be deducted', sl: 'Odbitek točk' },
  'member.rewards.remainingBalance': { en: 'Remaining balance', sl: 'Preostalo stanje' },
  'member.rewards.redeemedSuccess': { en: 'Reward successfully redeemed!', sl: 'Nagrada uspešno unovčena!' },
  'member.rewards.redeemFailed': { en: 'Redemption failed', sl: 'Unovčenje ni uspelo' },

  // Forgot Password & Reset Password
  'member.forgotPassword.title': { en: 'Forgot Your Password?', sl: 'Ste pozabili geslo?' },
  'member.forgotPassword.subtitle': { en: 'Enter your email and we will send reset instructions.', sl: 'Vnesite e-pošto in poslali vam bomo navodila za ponastavitev.' },
  'member.forgotPassword.sendLink': { en: 'Send Reset Link', sl: 'Pošlji povezavo za ponastavitev' },
  'member.forgotPassword.rememberPassword': { en: 'Remember your password?', sl: 'Se spomnite gesla?' },
  'member.forgotPassword.checkEmail': { en: 'Check Your Email', sl: 'Preverite e-pošto' },
  'member.forgotPassword.sentMessage': { en: 'If an account exists with this email, you will receive a password reset link.', sl: 'Če obstaja račun s to e-pošto, boste prejeli povezavo za ponastavitev gesla.' },
  'member.forgotPassword.expiresIn': { en: 'The link expires in 24 hours.', sl: 'Povezava poteče v 24 urah.' },
  'member.forgotPassword.backToLogin': { en: 'Back to Sign In', sl: 'Nazaj na prijavo' },
  'member.forgotPassword.backToHome': { en: 'Back to Home', sl: 'Nazaj na začetno stran' },
  
  'member.resetPassword.title': { en: 'Reset Your Password', sl: 'Ponastavitev gesla' },
  'member.resetPassword.newPassword': { en: 'New Password', sl: 'Novo geslo' },
  'member.resetPassword.passwordMinLength': { en: 'Minimum 6 characters', sl: 'Najmanj 6 znakov' },
  'member.resetPassword.confirmPassword': { en: 'Confirm Password', sl: 'Potrdite geslo' },
  'member.resetPassword.resetButton': { en: 'Reset Password', sl: 'Ponastavi geslo' },
  'member.resetPassword.passwordMismatch': { en: 'Passwords do not match', sl: 'Gesli se ne ujemata' },
  'member.resetPassword.passwordTooShort': { en: 'Password must be at least 6 characters', sl: 'Geslo mora vsebovati vsaj 6 znakov' },
  'member.resetPassword.invalidToken': { en: 'Invalid or expired reset link', sl: 'Neveljavna ali pretečena povezava' },
  'member.resetPassword.invalidLink': { en: 'This password reset link is invalid or has expired. Please request a new one.', sl: 'Ta povezava za ponastavitev gesla je neveljavna ali je potekla. Prosimo, zahtevajte novo.' },
  'member.resetPassword.success': { en: 'Password Reset Successfully!', sl: 'Geslo uspešno ponastavljeno!' },
  'member.resetPassword.redirecting': { en: 'Redirecting to login page...', sl: 'Preusmerjanje na stran za prijavo...' },
  'member.resetPassword.backToLogin': { en: 'Back to login', sl: 'Nazaj na prijavo' },

  'common.actions': { en: 'Actions', sl: 'Dejanja' },
  'common.close': { en: 'Close', sl: 'Zapri' },
  'common.previous': { en: 'Previous', sl: 'Prejšnja' },
  'common.next': { en: 'Next', sl: 'Naslednja' },
  'common.na': { en: '—', sl: '—' },

  // API / network errors (keys match server error strings)
  'error.requestFailed': { en: 'Request failed', sl: 'Zahteva ni uspela' },
  'error.network': { en: 'Could not reach the server', sl: 'Strežnika ni mogoče doseči' },
  'error.invalidEmail': { en: 'Invalid email', sl: 'Neveljaven e-poštni naslov' },
  'error.emailNotConfigured': {
    en: 'Email is not configured on the server. Contact support or try again later.',
    sl: 'E-pošta na strežniku ni nastavljena. Poskusite pozneje ali kontaktirajte podporo.',
  },
  'error.emailSendFailed': {
    en: 'Could not send the email. Check your SMTP settings and try again.',
    sl: 'E-pošte ni bilo mogoče poslati. Preverite SMTP nastavitve in poskusite znova.',
  },
  'member.forgotPassword.sendFailed': {
    en: 'Failed to send reset link',
    sl: 'Pošiljanje povezave za ponastavitev ni uspelo',
  },
  'member.resetPassword.resetFailed': {
    en: 'Failed to reset password',
    sl: 'Ponastavitev gesla ni uspela',
  },
};

const apiErrorKeyMap: Record<string, string> = {
  'Request failed': 'error.requestFailed',
  'Failed to send reset link': 'member.forgotPassword.sendFailed',
  'Invalid email': 'error.invalidEmail',
  'Failed to reset password': 'member.resetPassword.resetFailed',
  'Password reset failed': 'member.resetPassword.resetFailed',
  'Invalid or expired token': 'member.resetPassword.invalidToken',
  'Failed to fetch': 'error.network',
  'Email is not configured. Add SMTP_PASSWORD to server/.env (Gmail App Password) or set EMAIL_DEV_LOG=true for local development.':
    'error.emailNotConfigured',
  'Failed to send email': 'error.emailSendFailed',
};

const apiErrorCodeMap: Record<string, string> = {
  EMAIL_NOT_CONFIGURED: 'error.emailNotConfigured',
  EMAIL_SEND_FAILED: 'error.emailSendFailed',
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tTier: (tier: string) => string;
  tCategory: (category: string) => string;
  tApiError: (message: string, code?: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const tTier = (tier: string): string => {
    return translations[`tier.${tier}`]?.[language] ?? tier;
  };

  const tCategory = (category: string): string => {
    if (category === 'all') return t('category.all');
    return translations[`category.${category}`]?.[language] ?? category;
  };

  const tApiError = (message: string, code?: string): string => {
    if (code && apiErrorCodeMap[code]) return t(apiErrorCodeMap[code]);
    const key = apiErrorKeyMap[message];
    return key ? t(key) : message;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tTier, tCategory, tApiError }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}