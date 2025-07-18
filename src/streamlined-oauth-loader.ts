// Lazy loader for streamlined OAuth module
let moduleLoaded = false;



function loadModule() {
	if (!moduleLoaded) {
		
		moduleLoaded = true;
		import('./streamlined-oauth').then(() => {
			
		}).catch(err => {
			
		});
	}
}

// Load module on first interaction

['click', 'keydown', 'touchstart'].forEach(event => {
	document.addEventListener(event, loadModule, { once: true, passive: true });
});

// Preload on button hover
document.addEventListener('DOMContentLoaded', () => {
	
	const quickAuthorizeBtn = document.getElementById('quick-authorize-btn');
	if (quickAuthorizeBtn) {
		
		quickAuthorizeBtn.addEventListener('mouseenter', loadModule, { once: true });

		// Also load immediately for testing
		
		loadModule();
	} else {
		
	}
});
