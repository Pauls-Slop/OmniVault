// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Sample identities: plausible but invented personal data for sign-ups that do not need the real one, and for
// testing forms. The e-mail address uses the reserved domain example.com (RFC 2606); phone numbers come only from
// the US range reserved for fiction (555-0100…0199) and stay empty elsewhere. No ID document
// numbers are made up.
import { randomInt } from './generator.js';

const pick = (list) => list[randomInt(list.length)];

/** Per language: given names, family names, [postal code, city, region], street pattern, country, phone. */
const DATA = {
  de: {
    first: ['Anna', 'Lena', 'Marie', 'Sophie', 'Laura', 'Jonas', 'Felix', 'Lukas', 'Paul', 'Max', 'Emma', 'Ben'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Koch'],
    places: [['10115', 'Berlin', 'Berlin'], ['20095', 'Hamburg', 'Hamburg'], ['80331', 'München', 'Bayern'], ['50667', 'Köln', 'Nordrhein-Westfalen'], ['60311', 'Frankfurt am Main', 'Hessen'], ['04109', 'Leipzig', 'Sachsen']],
    street: (n) => `${pick(['Musterstraße', 'Beispielweg', 'Am Probenplatz', 'Testallee'])} ${n}`, country: 'Deutschland',
  },
  en: {
    first: ['Emily', 'Olivia', 'Grace', 'Chloe', 'Jack', 'Oliver', 'Henry', 'Samuel', 'Lucy', 'James', 'Ella', 'Noah'],
    last: ['Smith', 'Johnson', 'Brown', 'Taylor', 'Miller', 'Davis', 'Wilson', 'Clark', 'Walker', 'Hall'],
    places: [['62701', 'Springfield', 'IL'], ['97201', 'Portland', 'OR'], ['78701', 'Austin', 'TX'], ['80202', 'Denver', 'CO'], ['53703', 'Madison', 'WI']],
    street: (n) => `${n} ${pick(['Sample Street', 'Example Avenue', 'Test Lane', 'Placeholder Road'])}`, country: 'United States',
    phone: () => `+1 555-01${String(randomInt(100)).padStart(2, '0')}`,
  },
  es: {
    first: ['Lucía', 'Sofía', 'Martina', 'Paula', 'Hugo', 'Mateo', 'Pablo', 'Daniel', 'Elena', 'Javier'],
    last: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz'],
    places: [['28001', 'Madrid', 'Madrid'], ['08001', 'Barcelona', 'Cataluña'], ['46001', 'Valencia', 'Comunidad Valenciana'], ['41001', 'Sevilla', 'Andalucía']],
    street: (n) => `${pick(['Calle Ejemplo', 'Avenida de Prueba', 'Calle Modelo'])}, ${n}`, country: 'España',
  },
  fr: {
    first: ['Camille', 'Léa', 'Manon', 'Chloé', 'Louis', 'Gabriel', 'Arthur', 'Jules', 'Inès', 'Hugo'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau'],
    places: [['75001', 'Paris', 'Île-de-France'], ['69001', 'Lyon', 'Auvergne-Rhône-Alpes'], ['13001', 'Marseille', "Provence-Alpes-Côte d'Azur"], ['31000', 'Toulouse', 'Occitanie']],
    street: (n) => `${n} ${pick(["rue de l'Exemple", 'avenue du Modèle', "rue de l'Essai"])}`, country: 'France',
  },
  it: {
    first: ['Giulia', 'Sofia', 'Aurora', 'Alice', 'Leonardo', 'Francesco', 'Lorenzo', 'Matteo', 'Chiara', 'Marco'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco'],
    places: [['00118', 'Roma', 'Lazio'], ['20121', 'Milano', 'Lombardia'], ['10121', 'Torino', 'Piemonte'], ['50122', 'Firenze', 'Toscana']],
    street: (n) => `${pick(['Via Esempio', 'Via del Modello', 'Piazza Prova'])} ${n}`, country: 'Italia',
  },
  'pt-BR': {
    first: ['Ana', 'Beatriz', 'Mariana', 'Júlia', 'Lucas', 'Gabriel', 'Pedro', 'Rafael', 'Larissa', 'Mateus'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida'],
    places: [['01001-000', 'São Paulo', 'SP'], ['20010-000', 'Rio de Janeiro', 'RJ'], ['30110-000', 'Belo Horizonte', 'MG'], ['80010-000', 'Curitiba', 'PR']],
    street: (n) => `${pick(['Rua Exemplo', 'Avenida Modelo', 'Rua do Teste'])}, ${n}`, country: 'Brasil',
  },
  'zh-CN': {
    first: ['伟', '芳', '娜', '敏', '静', '磊', '洋', '艳', '勇', '杰'],
    last: ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周'],
    places: [['100000', '北京', '北京市'], ['200000', '上海', '上海市'], ['510000', '广州', '广东省'], ['610000', '成都', '四川省']],
    street: (n) => `${pick(['示例路', '样本街', '测试大道'])}${n}号`, country: '中国', familyFirst: true,
    latin: ['Wei', 'Fang', 'Na', 'Min', 'Jing', 'Lei', 'Yang', 'Yan', 'Yong', 'Jie'],
  },
  ja: {
    first: ['陽翔', '蓮', '湊', '結菜', '陽菜', '葵', '凛', '大和', '花', '翔'],
    last: ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤'],
    places: [['100-0001', '千代田区', '東京都'], ['530-0001', '大阪市', '大阪府'], ['460-0001', '名古屋市', '愛知県'], ['060-0001', '札幌市', '北海道']],
    street: (n) => `${pick(['見本町', '例示町', '試験町'])}${n}-${1 + randomInt(20)}`, country: '日本', familyFirst: true,
  },
};

/** Latin letters for the e-mail address (ä → ae, é → e; CJK names get a neutral handle). */
function handle(s) {
  return s.normalize('NFKD').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * A sample identity in the language's conventions → { name, identity } with the identity fields OmniVault uses
 * (firstName, lastName, email, phone, address1, postalCode, city, state, country).
 */
export function sampleIdentity(language = 'de') {
  const d = DATA[language] ?? DATA[language?.split('-')[0]] ?? DATA.en;
  const i = randomInt(d.first.length);
  const firstName = d.first[i];
  const lastName = pick(d.last);
  const [postalCode, city, state] = pick(d.places);
  const local = handle(`${firstName}.${lastName}`).length > 3 ? handle(firstName) + '.' + handle(lastName)
    : `${handle(d.latin?.[i] ?? '') || 'sample'}.${randomInt(9000) + 1000}`;
  const identity = {
    firstName, lastName,
    email: `${local}${randomInt(90) + 10}@example.com`,
    phone: d.phone?.() ?? '',
    address1: d.street(1 + randomInt(98)), postalCode, city, state, country: d.country,
  };
  return { name: d.familyFirst ? `${lastName}${firstName}` : `${firstName} ${lastName}`, identity };
}

export const SAMPLE_LANGUAGES = Object.keys(DATA);
