/**
 * Movimento padrão do atleta em todas as atividades (substitui os "controles de tanque").
 *
 * O que muda em relação ao Treino de Precisão original:
 * 1. O atleta escolhe PARA ONDE ir (16 direções no mundo) e o RITMO (parado, trote, corrida),
 *    em vez de "girar esquerda/direita" + "andar frente/ré".
 * 2. Tem embalo: acelera, freia e faz curva com limites. Correr rápido numa curva fechada
 *    abre a trajetória; para virar de verdade é preciso frear antes. Isso dá forma ao atributo
 *    Controle (aceleração, frenagem e giro do corpo) e faz o movimento sair em curvas.
 * 3. O corpo vira sozinho para onde está indo (ou para onde quer ir, quando parado), com
 *    velocidade de giro limitada. Não existe "girar parado à toa" como ação.
 * 4. Vê os alvos por posição relativa dentro de um cone de visão (não por raios finos).
 * 5. O cérebro decide a cada `DECISAO_QUADROS` quadros e a ação fica valendo nesse intervalo.
 *
 * Tudo determinístico: nenhuma aleatoriedade aqui dentro.
 */

export const DT = 1 / 30;
/** O cérebro decide a cada N quadros (8 = ~0,27 s, escolhido no laboratório por parecer mais natural). A ação fica valendo entre decisões. */
export const DECISAO_QUADROS = 8;
/** Número de direções possíveis (no mundo). */
export const DIRECOES = 16;
/** Ritmos: 0 = parado (só vira o corpo para a direção), 1 = trote, 2 = corrida. */
export const RITMOS = 3;
export const RITMO_FRACAO = [0, 0.55, 1] as const;
/** Ações de movimento: [direção, ritmo]. Atividades podem acrescentar decisões (ex.: chutar). */
export const ACOES_MOVIMENTO = [DIRECOES, RITMOS] as const;

/** Atributos do corpo que afetam o movimento, na escala do jogo (0–100). */
export interface AtributosMovimento { velocidade: number; controle: number }

/** Números da física a partir dos atributos. Base (50/50) ≈ números das fichas de atividade. */
export function fisica(a: AtributosMovimento) {
  const v = clamp01(a.velocidade / 100), c = clamp01(a.controle / 100);
  return {
    velMax: 3.5 + 2.0 * v,        // m/s       (50 → 4,5)
    acel: 3.5 + 5.0 * c,          // m/s²      (50 → 6)
    frenagem: 6 + 6 * c,          // m/s²      (50 → 9)
    curva: 5 + 9 * c,             // m/s² de aceleração lateral máxima (50 → 9,5)
    giro: 5 + 7 * c,              // rad/s, giro do corpo (50 → 8,5)
  };
}
export type Fisica = ReturnType<typeof fisica>;

export interface Corpo {
  x: number; z: number;
  vx: number; vz: number;
  /** direção para onde o corpo aponta (rad, plano x,z: x = cos, z = sin) */
  h: number;
  /** velocidade de giro do corpo neste quadro (rad/s), para a animação */
  w: number;
  /** aceleração neste quadro, separada em frente/trás e lateral (para a animação inclinar) */
  aFrente: number; aLado: number;
  /** distância percorrida (para a passada) */
  passada: number;
}

export const novoCorpo = (x = 0, z = 0, h = 0): Corpo => ({ x, z, vx: 0, vz: 0, h, w: 0, aFrente: 0, aLado: 0, passada: 0 });

export const anguloDirecao = (d: number) => (d / DIRECOES) * Math.PI * 2;
/** Direção (0..15) mais próxima de um ângulo. */
export const direcaoDoAngulo = (a: number) => ((Math.round((a / (Math.PI * 2)) * DIRECOES) % DIRECOES) + DIRECOES) % DIRECOES;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const difAngulo = (a: number, b: number) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

/** Um passo de física do corpo com a ação [direção, ritmo]. */
export function moverCorpo(c: Corpo, f: Fisica, direcao: number, ritmo: number, dt = DT) {
  const ang = anguloDirecao(direcao), alvoV = f.velMax * RITMO_FRACAO[ritmo];
  const dvx = Math.cos(ang) * alvoV - c.vx, dvz = Math.sin(ang) * alvoV - c.vz;
  const sp = Math.hypot(c.vx, c.vz);
  // eixo do movimento atual (ou do corpo, se parado)
  const ux = sp > 0.05 ? c.vx / sp : Math.cos(c.h), uz = sp > 0.05 ? c.vz / sp : Math.sin(c.h);
  let par = dvx * ux + dvz * uz;            // mudança ao longo do movimento (acelerar/frear)
  let lat = -dvx * uz + dvz * ux;           // mudança lateral (fazer curva)
  // limites: acelerar, frear e curvar. Em baixa velocidade a curva é livre (dá para "plantar e sair").
  const limPar = par >= 0 ? f.acel : f.frenagem;
  const limLat = f.curva + (sp < 1.2 ? f.acel * (1.2 - sp) * 2 : 0);
  par = Math.max(-limPar * dt, Math.min(limPar * dt, par));
  lat = Math.max(-limLat * dt, Math.min(limLat * dt, lat));
  c.vx += par * ux - lat * uz;
  c.vz += par * uz + lat * ux;
  const sp2 = Math.hypot(c.vx, c.vz);
  if (sp2 > f.velMax) { c.vx *= f.velMax / sp2; c.vz *= f.velMax / sp2; }
  c.x += c.vx * dt; c.z += c.vz * dt;
  c.aFrente = par / dt; c.aLado = lat / dt;
  c.passada += sp2 * dt;
  // corpo: aponta para onde vai; parado, aponta para onde quer ir
  const alvoH = sp2 > 0.6 ? Math.atan2(c.vz, c.vx) : ang;
  const d = difAngulo(c.h, alvoH);
  const w = Math.max(-f.giro, Math.min(f.giro, d * 12));
  c.h += w * dt; c.w = w;
}

/** Limita o corpo a um retângulo (meia-largura hx, meia-profundidade hz), perdendo a velocidade contra a parede. */
export function limitarRetangulo(c: Corpo, hx: number, hz: number, raio: number) {
  const lx = hx - raio, lz = hz - raio;
  if (c.x > lx) { c.x = lx; c.vx = Math.min(0, c.vx); } else if (c.x < -lx) { c.x = -lx; c.vx = Math.max(0, c.vx); }
  if (c.z > lz) { c.z = lz; c.vz = Math.min(0, c.vz); } else if (c.z < -lz) { c.z = -lz; c.vz = Math.max(0, c.vz); }
}

/** Visão: o alvo está dentro do cone (meia-abertura em rad; π = 360°) e do alcance? */
export function enxerga(c: Corpo, x: number, z: number, meiaAbertura: number, alcance: number) {
  const dx = x - c.x, dz = z - c.z, dist = Math.hypot(dx, dz);
  if (dist > alcance) return false;
  if (meiaAbertura >= Math.PI) return true;
  return Math.abs(difAngulo(c.h, Math.atan2(dz, dx))) <= meiaAbertura;
}

/**
 * Atributos do atleta das fitas. Cada fita é gravada uma vez só, com um atleta "de começo de carreira"
 * (os atributos iniciais vão de 25 a 40 em `jogo.ts`), que é onde o jogador está quando assiste.
 */
export const ATLETA_FITA: AtributosMovimento = { velocidade: 35, controle: 35 };

/** Estado no formato antigo das páginas ({x, z, h, v = velocidade para a frente, u = lateral}). */
export function espelhar(c: Corpo, p: { x: number; z: number; h: number; v: number; u?: number; phase?: number }) {
  p.x = c.x; p.z = c.z; p.h = c.h;
  p.v = c.vx * Math.cos(c.h) + c.vz * Math.sin(c.h);
  p.u = -c.vx * Math.sin(c.h) + c.vz * Math.cos(c.h);
  p.phase = c.passada * 2.4;
}

/** Limita o corpo a um círculo de raio r (perde a velocidade que aponta para fora). */
export function limitarCirculo(c: Corpo, r: number) {
  const d = Math.hypot(c.x, c.z);
  if (d > r) {
    const nx = c.x / d, nz = c.z / d; c.x = nx * r; c.z = nz * r;
    const vn = c.vx * nx + c.vz * nz; if (vn > 0) { c.vx -= vn * nx; c.vz -= vn * nz; }
  }
}
