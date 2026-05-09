/**
 * Static mock data for the LexVeille prototype.
 * In production, replace with API calls to the Go backend.
 */
import type {
  AppUser, AlertItem, Contract, DraftEmail,
  DomainConfig, WatchSource, Client, AgentTranscript, ContractModel,
} from '@/types';

export const MOCK_USER: AppUser = {
  name: 'Me. S. Tremblay',
  initials: 'ST',
  role: 'Droit agricole & santé',
  firstName: 'Sophie',
};

export const MOCK_ALERTS: AlertItem[] = [
  {
    id: 'arla-glypho',
    severity: 'critical',
    domain: 'pest',
    domainLabel: 'Pesticides',
    title: "Loi sur les produits antiparasitaires, L.C. 2002, ch. 28 — Retrait d'homologation du glyphosate (décision finale)",
    articleRef: 'Art. 12 & 19',
    legislationRef: 'Loi sur les produits antiparasitaires, L.C. 2002, ch. 28',
    source: 'Pesticides · ARLA',
    sourceFull: "Agence de réglementation de la lutte antiparasitaire · 10 jan. 2025",
    clients: 6, contracts: 5,
    time: 'Il y a 1h',
    deadline: '15 fév. 2025',
    modCount: 3,
    modifications: [
      {
        impact: 'high',
        title: "Art. 12 — Homologation des produits antiparasitaires",
        subtitle: "Retrait de l'homologation — interdiction de vente et d'utilisation",
        before: "…le glyphosate est homologué pour usage agricole sous REG-2018-GL-004…",
        after:  "…l'homologation du glyphosate est révoquée. Toute vente interdite dès le 15 fév. 2025…",
        contractsCount: 3,
        contracts: [
          { name: 'Ferme Beausoleil', urgent: true },
          { name: 'Coop Agri-Nord',   urgent: true },
          { name: 'AgroServices Vallée', urgent: false },
        ],
      },
      {
        impact: 'high',
        title: "Art. 19 — Obligations de retrait du marché",
        subtitle: "Délai de retrait des stocks réduit de 12 mois à 45 jours",
        before: "…les titulaires disposent de 12 mois pour retirer leurs stocks du marché…",
        after:  "…les titulaires disposent de 45 jours pour retirer leurs stocks à compter de la décision…",
        contractsCount: 2,
        contracts: [
          { name: 'Ferme Beausoleil',      urgent: true },
          { name: 'Semences Laurentides',  urgent: false },
        ],
      },
      {
        impact: 'medium',
        title: "Art. 31 — Responsabilité du conseiller agronomique",
        subtitle: "Extension de la responsabilité aux conseils donnés après la date de retrait",
        before: "…responsabilité limitée aux produits homologués au moment du conseil…",
        after:  "…tout conseil relatif à un produit révoqué engage la responsabilité pleine du conseiller…",
        contractsCount: 2,
        contracts: [
          { name: 'AgroServices Vallée', urgent: false },
          { name: 'Domaine St-François', urgent: false },
        ],
      },
    ],
  },
  {
    id: 'sc-lmr',
    severity: 'critical',
    domain: 'sante',
    domainLabel: 'Santé',
    title: "Loi sur le renforcement de la protection de l'environnement pour un Canada en santé, L.C. 2023, ch. 12",
    articleRef: 'Art. 4 & 31',
    legislationRef: 'Loi sur le renforcement de la protection de l\'environnement pour un Canada en santé, L.C. 2023, ch. 12',
    source: 'Santé · Lois annuelles 2023, ch. 12',
    sourceFull: 'laws-lois.justice.gc.ca · Lois annuelles 2023, ch. 12',
    clients: 4, contracts: 3,
    time: 'Il y a 3h',
    deadline: '28 fév. 2025',
    modCount: 2,
  },
  {
    id: 'semences-ogm',
    severity: 'high',
    domain: 'agri',
    domainLabel: 'Agriculture',
    title: "Loi sur les semences — Amendement obligations de traçabilité OGM",
    articleRef: 'Art. 7',
    source: 'Agriculture · ACIA',
    clients: 5, contracts: 4,
    time: 'Hier',
    deadline: '01 mars 2025',
    modCount: 4,
  },
  {
    id: 'pmra-neo',
    severity: 'high',
    domain: 'pest',
    domainLabel: 'Pesticides',
    title: "PMRA — Mise à jour conditions d'utilisation des néonicotinoïdes",
    articleRef: 'Art. 8 & 22',
    source: 'Pesticides · PMRA',
    clients: 3, contracts: 2,
    time: 'Hier',
    deadline: '15 mars 2025',
    modCount: 2,
  },
  {
    id: 'engrais-azote',
    severity: 'high',
    domain: 'agri',
    domainLabel: 'Agriculture',
    title: "Règlement sur les engrais — Nouvelles normes de composition azotée",
    articleRef: 'Art. 3',
    source: 'Agriculture · AAC',
    clients: 2, contracts: 1,
    time: '3 jan.',
    deadline: '30 avril 2025',
    modCount: 1,
  },
  {
    id: 'ceta-import',
    severity: 'low',
    domain: 'comm',
    domainLabel: 'Commerce',
    title: "AECG/CETA — Mise à jour des contingents tarifaires agricoles 2025",
    articleRef: 'Annexe 2-A',
    source: 'Commerce · Affaires mondiales Canada',
    clients: 1, contracts: 1,
    time: '2 jan.',
    deadline: '30 juin 2025',
    modCount: 1,
  },
  {
    id: 'env-eau',
    severity: 'low',
    domain: 'env',
    domainLabel: 'Environnement',
    title: "Loi sur les ressources en eau — Nouvelles exigences de déclaration des prélèvements agricoles",
    articleRef: 'Art. 14',
    source: 'Environnement · ECCC',
    clients: 2, contracts: 2,
    time: '15 déc.',
    deadline: '1 juil. 2025',
    modCount: 1,
  },
];

export const MOCK_CLIENT_MODELS: Record<string, ContractModel[]> = {
  PB: [
    { id: 'LXV-BEA-2023-047', title: "Contrat de fourniture d'herbicides — Ferme Beausoleil inc.", domain: 'pest', status: 'urgent',    clausesToModify: 2, deadline: '15 fév. 2025' },
    { id: 'LXV-BEA-2022-031', title: "Contrat de services agronomiques — saison 2022-2024",       domain: 'agri', status: 'to-revise', clausesToModify: 1, deadline: '01 mars 2025' },
    { id: 'LXV-BEA-2021-009', title: "Accord de confidentialité — Ferme Beausoleil inc.",          domain: 'agri', status: 'ok',        clausesToModify: 0 },
  ],
  CA: [
    { id: 'LXV-AGR-2022-031', title: "Contrat de distribution de produits phytosanitaires",        domain: 'pest', status: 'urgent',    clausesToModify: 1, deadline: '15 fév. 2025' },
    { id: 'LXV-AGR-2023-014', title: "Convention d'approvisionnement en semences certifiées",      domain: 'agri', status: 'ok',        clausesToModify: 0 },
  ],
  SL: [
    { id: 'LXV-SEM-2023-005', title: "Contrat de licence OGM — Semences Laurentides inc.",         domain: 'agri', status: 'to-revise', clausesToModify: 1, deadline: '01 mars 2025' },
  ],
  AV: [
    { id: 'LXV-AGR-2022-018', title: "Contrat de conseil agronomique — AgroServices Vallée",       domain: 'agri', status: 'to-revise', clausesToModify: 1, deadline: '28 fév. 2025' },
    { id: 'LXV-AGR-2021-044', title: "Contrat de prestations de services techniques",              domain: 'agri', status: 'ok',        clausesToModify: 0 },
  ],
  DS: [
    { id: 'LXV-DSF-2023-005', title: "Contrat de bail agricole — Domaine St-François",             domain: 'agri', status: 'to-revise', clausesToModify: 1, deadline: '28 fév. 2025' },
    { id: 'LXV-DSF-2022-017', title: "Contrat de fourniture d'intrants biologiques",               domain: 'sante', status: 'ok',       clausesToModify: 0 },
  ],
};

export const MOCK_CONTRACT: Contract = {
  id: 'LXV-BEA-2023-047',
  title: "Contrat de fourniture d'herbicides — Ferme Beausoleil inc.",
  client: 'Pierre Beausoleil',
  email: 'p.beausoleil@fermebeausoleil.ca',
  signedOn: '3 mars 2023',
  deadline: '15 fév. 2025',
  domain: 'pest',
  clausesToModify: 2,
  clauses: [
    {
      id: 'a31', urgent: true,
      title: "Art. 3.1 — Produits visés par le contrat",
      current: '"Le contrat couvre la fourniture de produits herbicides incluant le Roundup (glyphosate REG-2018-GL-004) pour la saison agricole 2023-2025."',
      problem: "Problème : produit dont l'homologation est révoquée (ARLA, Art. 12)",
      next: '"Le contrat couvre la fourniture de produits herbicides homologués conformément à la liste en vigueur de l\'ARLA à la date de chaque livraison. Tout produit révoqué est automatiquement exclu."',
    },
    {
      id: 'a74', urgent: true,
      title: "Art. 7.4 — Responsabilité et garanties",
      current: '"Le fournisseur garantit la conformité des produits aux homologations en vigueur au moment de la signature du contrat."',
      problem: "Problème : responsabilité étendue aux conseils post-retrait (ARLA, Art. 31)",
      next: '"Le fournisseur garantit la conformité à la date de chaque livraison et s\'engage à informer le client dans les 5 jours de tout retrait d\'homologation."',
      addition: '"Art. 7.5 (nouveau) — En cas de retrait, les parties conviennent d\'un produit de substitution ou d\'une résiliation sans frais dans les 15 jours."',
    },
  ],
  actions: [
    { n: 1, t: "Préparer l'avenant",      d: "Rédiger l'avenant no 1 intégrant les modifications des art. 3.1 et 7.4 et l'ajout de l'art. 7.5." },
    { n: 2, t: "Notifier Pierre Beausoleil", d: "Lui transmettre le projet d'avenant pour validation avant signature." },
    { n: 3, t: "Délai : 15 fév. 2025",    d: "L'avenant doit être signé avant cette date pour protéger le client." },
    { n: 4, t: "Archiver",                 d: "Après signature, programmer un rappel pour la saison 2025-2026." },
  ],
  note: "La révocation par l'ARLA constitue un changement imprévisible au sens de l'art. 1470 C.c.Q. La clause de force majeure (art. 9.2) pourrait s'appliquer, mais une modification explicite reste préférable pour éviter tout litige.",
};

export interface NotifierClient {
  initials: string;
  name: string;
  email: string;
  phone: string;
  contractId: string;
  email_draft: DraftEmail;
}

export const MOCK_NOTIFIER_CLIENTS: NotifierClient[] = [
  {
    initials: 'PB',
    name: 'Pierre Beausoleil — Ferme Beausoleil inc.',
    email: 'p.beausoleil@fermebeausoleil.ca',
    phone: '+1 (418) 555-0134',
    contractId: 'LXV-BEA-2023-047',
    email_draft: {
      to: 'Pierre Beausoleil <p.beausoleil@fermebeausoleil.ca>',
      cc: 'Me. Sophie Tremblay <s.tremblay@lexveille.ca>',
      subject: "Modification requise à votre contrat — Retrait d'homologation du glyphosate (ARLA)",
      body: `Monsieur Beausoleil,

Suite au retrait définitif de l'homologation du glyphosate par l'ARLA (décision du 10 janvier 2025, en vigueur le 15 février 2025), deux clauses de votre contrat LXV-BEA-2023-047 doivent être modifiées pour protéger vos intérêts :

  • Article 3.1 — redéfinition des produits visés par le contrat
  • Article 7.4 — mise à jour des garanties et responsabilités du fournisseur

Je vous fais parvenir en pièce jointe un projet d'avenant (Avenant no 1). Je suis disponible cette semaine pour en discuter avant signature.

Ce changement doit être formalisé avant le 15 février 2025.

Cordialement,
Me. Sophie Tremblay — Droit agricole & santé
LexVeille · (514) 555-0198`,
    },
  },
  {
    initials: 'CA',
    name: 'Coop Agri-Nord',
    email: 'direction@coopagrinord.ca',
    phone: '+1 (819) 555-0271',
    contractId: 'LXV-AGR-2022-031',
    email_draft: {
      to: 'Coop Agri-Nord <direction@coopagrinord.ca>',
      cc: 'Me. Sophie Tremblay <s.tremblay@lexveille.ca>',
      subject: "Modification requise à votre contrat — Retrait d'homologation du glyphosate (ARLA)",
      body: `Madame, Monsieur,

Suite au retrait définitif de l'homologation du glyphosate par l'ARLA (décision du 10 janvier 2025, en vigueur le 15 février 2025), une clause de votre contrat LXV-AGR-2022-031 doit être modifiée :

  • Article 4.2 — mise à jour de la liste des produits homologués autorisés

Je vous fais parvenir en pièce jointe un projet d'avenant. Je reste disponible pour en discuter avant signature.

Ce changement doit être formalisé avant le 15 février 2025.

Cordialement,
Me. Sophie Tremblay — Droit agricole & santé
LexVeille · (514) 555-0198`,
    },
  },
];

export const MOCK_EMAIL: DraftEmail = {
  to: 'Pierre Beausoleil <p.beausoleil@fermebeausoleil.ca>',
  cc: 'Me. Sophie Tremblay <s.tremblay@lexveille.ca>',
  subject: "Modification requise à votre contrat — Retrait d'homologation du glyphosate (ARLA)",
  body: `Monsieur Beausoleil,

Suite au retrait définitif de l'homologation du glyphosate par l'ARLA (décision du 10 janvier 2025, en vigueur le 15 février 2025), deux clauses de votre contrat LXV-BEA-2023-047 doivent être modifiées pour protéger vos intérêts :

  • Article 3.1 — redéfinition des produits visés par le contrat
  • Article 7.4 — mise à jour des garanties et responsabilités du fournisseur

Je vous fais parvenir en pièce jointe un projet d'avenant (Avenant no 1). Je suis disponible cette semaine pour en discuter avant signature.

Ce changement doit être formalisé avant le 15 février 2025.

Cordialement,
Me. Sophie Tremblay — Droit agricole & santé
LexVeille · (514) 555-0198`,
};

export const MOCK_DOMAINS: DomainConfig[] = [
  { id: 'agri',  name: 'Agriculture & alimentation', sub: 'ACIA, AAC, Loi sur les semences',      dotCls: 'bg-emerald-500', on: true  },
  { id: 'pest',  name: 'Pesticides & homologation',  sub: 'ARLA, PMRA, antiparasitaires',          dotCls: 'bg-amber-500',   on: true  },
  { id: 'sante', name: 'Santé & médicaments',        sub: 'Santé Canada, aliments & drogues',      dotCls: 'bg-brand-500',   on: true  },
  { id: 'env',   name: 'Environnement & eau',        sub: 'ECCC, protection environnement',        dotCls: 'bg-teal-500',    on: false },
  { id: 'comm',  name: 'Commerce & exportation',     sub: 'CETA, accords bilatéraux',              dotCls: 'bg-ink-300',     on: false },
];

export const MOCK_KEYWORDS = [
  'glyphosate', 'homologation', 'pesticides', 'LMR résidus',
  'néonicotinoïdes', 'OGM traçabilité', 'Santé Canada', 'ARLA décision', 'engrais azote',
];

export const MOCK_SOURCES: WatchSource[] = [
  { name: "ARLA — Décisions d'homologation",      url: 'canada.ca/fr/sante-canada/antiparasitaires', on: true,  icon: 'building', type: 'internal' },
  { name: "Santé Canada — Gazette officielle",    url: 'gazette.gc.ca/rp-pr/p2/index.html',          on: true,  icon: 'building', type: 'internal' },
  { name: "ACIA — Avis réglementaires",           url: 'inspection.canada.ca/fr/avis',               on: true,  icon: 'building', type: 'internal' },
  { name: "CanLII — Jurisprudence agricole",      url: 'canlii.org/fr',                              on: true,  icon: 'shield',   type: 'internal' },
  { name: "Agriculture et Agroalimentaire Canada", url: 'agr.gc.ca/fra/politiques-agricoles',        on: true,  icon: 'building', type: 'internal' },
  { name: "Modèles de contrats",   url: 'springer.com/journal/10340/rss',             on: false, icon: 'rss',      type: 'external' }
];

export const MOCK_CLIENTS: Client[] = [
  { code: 'PB', name: 'Pierre Beausoleil — Ferme Beausoleil inc.', detail: 'Agriculture · Pesticides · 3 contrats',      count: 3, color: 'bg-brand-100 text-brand-700'    },
  { code: 'CA', name: 'Coop Agri-Nord',                            detail: 'Agriculture · Distribution · 2 contrats',    count: 2, color: 'bg-amber-100 text-amber-800'    },
  { code: 'SL', name: 'Semences Laurentides inc.',                 detail: 'Agriculture · OGM · 1 contrat',              count: 1, color: 'bg-emerald-100 text-emerald-800' },
  { code: 'AV', name: 'AgroServices Vallée',                       detail: 'Conseil agronomique · Pesticides · 2 contrats', count: 2, color: 'bg-teal-100 text-teal-800'  },
  { code: 'DS', name: 'Domaine St-François',                       detail: 'Agriculture · Santé · 2 contrats',           count: 2, color: 'bg-indigo-100 text-indigo-800'  },
];

// Per-screen agent transcripts keyed by route segment
export const MOCK_TRANSCRIPTS: Record<string, AgentTranscript> = {
  dashboard: {
    status: 'Actif · accès complet',
    quickActions: [
      { label: 'Chercher un contrat', icon: 'search' },
      { label: 'Clients affectés',    icon: 'users'  },
      { label: 'Rédiger courriel',    icon: 'send'   },
    ],
    messages: [
      { role: 'agent', time: '08:02', content: "Bonjour {{userName}}. Ce matin, <strong>2 alertes critiques</strong> touchent <strong>8 de vos clients</strong>. Voulez-vous un résumé des actions prioritaires ?" },
      { role: 'user',  time: '08:14', content: "Oui, quels clients sont les plus urgents ?" },
      { role: 'agent', time: '08:14', content: "Les 2 clients les plus exposés avec des délais imminents :",
        results: [
          { chip: 'Critique', chipVariant: 'critical', name: 'Ferme Beausoleil', sub: '2 contrats · Glyphosate · Délai 15 fév.' },
          { chip: 'Critique', chipVariant: 'critical', name: 'Coop Agri-Nord',   sub: '1 contrat · Glyphosate + LMR · Délai 15 fév.' },
        ],
      },
      { role: 'user',  time: '08:16', content: "Prépare les communications pour ces deux clients" },
      { role: 'agent', time: '08:16', content: "Je prépare les courriels et les avenants pour Ferme Beausoleil et Coop Agri-Nord. Confirmez-vous l'envoi ?" },
    ],
  },
  alertes: {
    status: 'Contexte : alerte glyphosate',
    messages: [
      { role: 'agent', time: '08:05', content: "Je vois que vous consultez l'alerte glyphosate. <strong>Ferme Beausoleil</strong> est votre client le plus exposé — 2 contrats visés par les Art. 12 et 19." },
      { role: 'user',  time: '08:18', content: "Est-ce qu'un autre client est touché par l'Art. 31 ?" },
      { role: 'agent', time: '08:18', content: "Oui — 2 clients ont des contrats de conseil agronomique concernés :",
        results: [
          { chip: 'À réviser', chipVariant: 'high', name: 'AgroServices Vallée', sub: 'LXV-AGR-2022-018 · Clause 6.1'  },
          { chip: 'À réviser', chipVariant: 'high', name: 'Domaine St-François', sub: 'LXV-DSF-2023-005 · Clause 4.3' },
        ],
      },
      { role: 'user',  time: '08:20', content: "Ouvre le contrat de Ferme Beausoleil" },
      { role: 'agent', time: '08:20', content: "Je vous redirige vers le contrat LXV-BEA-2023-047.",
        suggestion: { label: 'LXV-BEA-2023-047 — Fourniture herbicides', icon: 'fileText', target: '/contrats' },
      },
    ],
  },
  contrats: {
    status: 'Contrat LXV-BEA-2023-047',
    messages: [
      { role: 'agent', time: '08:22', content: "Je vois le contrat de Ferme Beausoleil. Les <strong>2 clauses à modifier</strong> sont Art. 3.1 et Art. 7.4. Voulez-vous que je rédige le courriel à Pierre Beausoleil avec l'avenant en pièce jointe ?" },
      { role: 'user',  time: '08:23', content: "Oui, rédige le courriel" },
      { role: 'agent', time: '08:23', content: "Courriel préparé pour Pierre Beausoleil avec l'avenant no 1 en pièce jointe. Objet : <em>Modification requise — Retrait glyphosate ARLA</em>.",
        suggestion: { label: 'Voir le courriel préparé', icon: 'mail', target: '/notifier' },
      },
    ],
  },
  notifier: {
    status: 'Étape 4 — Notification client',
    messages: [
      { role: 'agent', time: '08:25', content: "Le courriel pour Pierre Beausoleil est prêt, avec l'avenant no 1 en pièce jointe. Souhaitez-vous modifier quelque chose avant l'envoi ?" },
      { role: 'user',  time: '08:26', content: "Ajoute une phrase sur la disponibilité pour une rencontre cette semaine" },
      { role: 'agent', time: '08:26', content: "J'ai ajouté : <em>« Je suis disponible cette semaine pour en discuter avant signature. »</em> La phrase est maintenant dans le message. Prêt à envoyer ?" },
    ],
  },
  parametres: {
    status: 'Aide à la configuration',
    messages: [
      { role: 'agent', time: '09:10', content: "Vous configurez la veille. Je peux suggérer des sources et mots-clés à partir de vos contrats existants. Voulez-vous que je le fasse ?" },
    ],
  },
  historique: {
    status: 'Historique des veilles',
    messages: [
      { role: 'agent', time: '09:00', content: "L'historique complet sera disponible bientôt. En attendant, je peux ressortir n'importe quelle alerte des 90 derniers jours." },
    ],
  },
  onboarding: { status: '', messages: [], hidden: true },
};
