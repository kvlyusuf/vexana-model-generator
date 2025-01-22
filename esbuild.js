const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] Build started...');
		});
		build.onEnd((result) => {
			if (result.errors.length > 0) {
				console.error('[watch] Build finished with errors:');
				result.errors.forEach(({ text, location }) => {
					if (location) {
						console.error(`✘ [ERROR] ${text}`);
						console.error(`    ${location.file}:${location.line}:${location.column}`);
					} else {
						console.error(`✘ [ERROR] ${text}`);
					}
				});
			} else {
				console.log('[watch] Build finished successfully!');
			}

			if (result.warnings.length > 0) {
				console.warn('[watch] Build finished with warnings:');
				result.warnings.forEach(({ text, location }) => {
					if (location) {
						console.warn(`⚠️ [WARNING] ${text}`);
						console.warn(`    ${location.file}:${location.line}:${location.column}`);
					} else {
						console.warn(`⚠️ [WARNING] ${text}`);
					}
				});
			}
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts' // Giriş dosyasını tanımlayın
		],
		bundle: true, // Tek bir dosya olarak birleştirin
		format: 'cjs', // CommonJS formatı kullanılıyor
		minify: production, // Production modunda minify aktif
		sourcemap: !production, // Hata ayıklama için source map
		sourcesContent: false, // Gereksiz kaynak içeriği kaldırılır
		platform: 'node', // Node.js platformu hedefleniyor
		outfile: 'out/extension.js', // Çıkış dosyası yolu
		external: ['vscode'], // Vscode modülü dışarıda bırakılır
		logLevel: 'silent', // Log seviyesini sessize alın
		plugins: [
			esbuildProblemMatcherPlugin, // Esbuild problem matcher eklendi
		],
	});
	if (watch) {
		console.log('[watch] Watching for changes...');
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
		console.log('[build] Build completed!');
	}
}

main().catch(e => {
	console.error(`[build] Build failed: ${e.message}`);
	process.exit(1);
});