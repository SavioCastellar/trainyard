/**
 * Gerador pseudoaleatório com semente (mulberry32).
 *
 * Toda aleatoriedade da simulação passa por aqui. Com a mesma semente e as mesmas
 * ações, a partida se repete exatamente — é isso que permite auditar resultados.
 *
 * Observação: `gauss()` usa Math.log/sqrt/cos, que são determinísticos dentro de uma
 * mesma versão do Node (o servidor), mas podem variar no último bit entre motores
 * JavaScript diferentes. Por isso o servidor é a fonte oficial dos resultados e o
 * navegador apenas toca replays gravados.
 */
export class Rng {
  private s: number;
  private spare: number | null = null;

  constructor(seed: number) {
    this.s = (seed >>> 0) || 0x9e3779b9;
  }

  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  gauss(): number {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return s;
    }
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    const r = Math.sqrt(-2 * Math.log(u));
    this.spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  }
}
