import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util';

declare global {
    var TextEncoder: typeof NodeTextEncoder;
    var TextDecoder: typeof NodeTextDecoder;
}

// Этот экспорт пустого объекта нужен, чтобы TypeScript
// расценивал этот файл как модуль
export {};