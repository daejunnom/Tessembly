export type Block = { kind: 'p' | 'code' | 'table' | 'note' | 'list'; text?: string; language?: string; headers?: string[]; rows?: string[][]; items?: string[] };
export type Section = { id: string; title: string; blocks: Block[] };
export type Chapter = { slug: string; title: string; kicker: string; summary: string; sections: Section[] };
