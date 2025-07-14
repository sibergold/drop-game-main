// Lazy loader for streamlined OAuth module
let moduleLoaded = false;

console.log('🔧 Streamlined OAuth loader script loaded');

function loadModule() {
	if (!moduleLoaded) {
		console.log('🔧 Loading streamlined OAuth module...');
		moduleLoaded = true;
		import('./streamlined-oauth').then(() => {
			console.log('✅ Streamlined OAuth module loaded successfully');
		}).catch(err => {
			console.error('❌ Failed to load streamlined OAuth module:', err);
		});
	}
}

// Load module on first interaction
console.log('🔧 Setting up event listeners for module loading...');
['click', 'keydown', 'touchstart'].forEach(event => {
	document.addEventListener(event, loadModule, { once: true, passive: true });
});

// Preload on button hover
document.addEventListener('DOMContentLoaded', () => {
	console.log('🔧 DOM loaded, setting up button hover listener...');
	const quickAuthorizeBtn = document.getElementById('quick-authorize-btn');
	if (quickAuthorizeBtn) {
		console.log('🔧 Quick authorize button found, adding hover listener');
		quickAuthorizeBtn.addEventListener('mouseenter', loadModule, { once: true });

		// Also load immediately for testing
		console.log('🔧 Loading module immediately for testing...');
		loadModule();
	} else {
		console.error('❌ Quick authorize button not found!');
	}
});
