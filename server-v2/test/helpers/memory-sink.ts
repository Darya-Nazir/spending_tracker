import { Writable } from 'node:stream';

export class MemorySink extends Writable {
    private chunks: Buffer[] = [];

    override _write(
        chunk: Buffer | string,
        _encoding: BufferEncoding,
        done: (error?: Error | null) => void,
    ): void {
        this.chunks.push(Buffer.from(chunk));
        done();
    }

    async text(): Promise<string> {
        for (let i = 0; i < 3; i += 1) {
            await new Promise((resolve) => setImmediate(resolve));
        }
        return Buffer.concat(this.chunks).toString('utf8');
    }

    /** Записанное, разбитое по переводам строки; пустые строки отброшены. */
    async lines(): Promise<string[]> {
        const text = await this.text();
        return text.split('\n').filter((line) => line.trim() !== '');
    }

    /** Строки, разобранные через JSON.parse. Для режима development не подходит. */
    async records(): Promise<Record<string, unknown>[]> {
        const lines = await this.lines();
        return lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    }
}
