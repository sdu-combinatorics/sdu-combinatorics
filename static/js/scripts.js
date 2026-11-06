const content_dir = 'contents/';
const config_file = 'config.yml';
const section_names = ['home', 'members', 'conferences', 'courses', 'seminars', 'aitalks', 'news'];

window.addEventListener('DOMContentLoaded', () => {

    const seminarsLink = document.querySelector(
        '#mainNav .navbar-nav a[href="seminars.html"]'
    );

    const existingAITalksLink = document.querySelector(
        '#mainNav .navbar-nav a[href="aitalks.html"]'
    );

    if (seminarsLink && !existingAITalksLink) {
        const newItem = document.createElement('li');
        newItem.className = 'nav-item';

        newItem.innerHTML =
            '<a class="nav-link me-lg-3" href="aitalks.html">AI TALKS</a>';

        seminarsLink.closest('li').after(newItem);
    }

    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );

    responsiveNavItems.forEach((responsiveNavItem) => {
        responsiveNavItem.addEventListener('click', () => {
            if (navbarToggler && window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });

    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                const el = document.getElementById(key);
                if (el) {
                    el.innerHTML = yml[key];
                }
            });
        })
        .catch(error => console.log('YAML load error:', error));

    if (window.marked) {
        marked.use({ mangle: false, headerIds: false });
    }

    section_names.forEach((name) => {
        const container = document.getElementById(name + '-md');
        if (!container) return;

        fetch(content_dir + name + '.md')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${name}.md`);
                }
                return response.text();
            })
            .then(markdown => {
                if (!window.marked) {
                    throw new Error('marked is not loaded');
                }

                const html = marked.parse(markdown);
                container.innerHTML = html;
                initAiTalkPreviews(container);
        if (name === 'home') {
            updateHomeNews();
            }
 
                if (['conferences', 'courses', 'seminars'].includes(name)) {
                    formatItemsWithPoster(name + '-md');
                }

                if (window.MathJax) {
                    if (typeof MathJax.typesetPromise === 'function') {
                        MathJax.typesetPromise([container]).catch(console.error);
                    } else if (typeof MathJax.typeset === 'function') {
                        MathJax.typeset();
                    }
                }

                if (name === 'news') {
                    addNewsShareButtons('news-md');
                    setTimeout(scrollToHashAfterRender, 50);
                }
            })
            .catch(error => console.log(`Markdown load error (${name}):`, error));
    });

    window.addEventListener('hashchange', scrollToHashAfterRender);
});

function scrollToHashAfterRender() {
    const hash = window.location.hash;
    if (!hash) return;

    const target = document.querySelector(hash);
    if (!target) return;

    target.scrollIntoView({
        behavior: 'auto',
        block: 'start'
    });
}

function formatItemsWithPoster(targetId) {
    const section = document.getElementById(targetId);
    if (!section) return;

    const raw = section.innerHTML.trim();
    if (!raw) return;

    const htmlBlocks = raw.split('<li>').join('<!--split-->').split('<!--split-->');
    let result = '';

    htmlBlocks.forEach(block => {
        const posterMatch = block.match(/Poster:\s*(https?:\/\/[^\s<]+|static\/[^\s<]+)/);
        if (posterMatch) {
            const posterUrl = posterMatch[1];
            const cleanBlock = block.replace(/Poster:.*$/, '');
            result += `
                <div class="item-wrapper">
                    <div class="item-text">${cleanBlock}</div>
                    <img src="${posterUrl}" loading="lazy">
                </div>
            `;
        } else {
            result += block;
        }
    });

    section.innerHTML = result;
}

async function waitForImagesInNode(root) {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        });
    }));
}

function isWeChatBrowser() {
    return /MicroMessenger/i.test(navigator.userAgent);
}

function canWriteImageToClipboard() {
    return !!(
        window.isSecureContext &&
        navigator.clipboard &&
        typeof navigator.clipboard.write === 'function' &&
        window.ClipboardItem
    );
}

async function tryWriteBlobToClipboard(blob) {
    await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
    ]);
}

async function tryNativeShare(blob, fileName = 'screenshot.png') {
    if (!navigator.canShare || !navigator.share) return false;

    try {
        const file = new File([blob], fileName, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Screenshot'
            });
            return true;
        }
    } catch (err) {
        console.warn('Native share failed:', err);
    }
    return false;
}

function showImagePreviewOverlay(blob, tipText = 'Press and hold the image to save or share.') {
    const url = URL.createObjectURL(blob);

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.75)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '1rem';

    const tip = document.createElement('div');
    tip.textContent = tipText;
    tip.style.color = '#fff';
    tip.style.fontSize = '1rem';
    tip.style.marginBottom = '1rem';
    tip.style.textAlign = 'center';
    tip.style.maxWidth = '90%';

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Screenshot Preview';
    img.style.maxWidth = '95%';
    img.style.maxHeight = '75vh';
    img.style.borderRadius = '12px';
    img.style.boxShadow = '0 0.5rem 1rem rgba(0,0,0,0.25)';
    img.style.background = '#fff';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '1rem';
    closeBtn.style.padding = '0.5rem 1rem';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.cursor = 'pointer';

    function cleanup() {
        URL.revokeObjectURL(url);
        overlay.remove();
    }

    closeBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
    });

    overlay.appendChild(tip);
    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
}

async function shareImageBlob(blob, options = {}) {
    const {
        fileName = 'screenshot.png',
        successMessage = '✅ Screenshot copied to clipboard.'
    } = options;

    if (!isWeChatBrowser() && canWriteImageToClipboard()) {
        try {
            await tryWriteBlobToClipboard(blob);
            alert(successMessage);
            return;
        } catch (err) {
            console.warn('Clipboard image write failed:', err);
        }
    }

    const shared = await tryNativeShare(blob, fileName);
    if (shared) return;

    showImagePreviewOverlay(
        blob,
        isWeChatBrowser()
            ? 'In WeChat, please long-press the image to save or share.'
            : 'Press and hold the image to save or share.'
    );
}

async function captureNodeToBlob(node, options = {}) {
    const { needMath = true } = options;

    if (!node) {
        throw new Error('Target node not found.');
    }

    if (!window.domtoimage) {
        throw new Error('Screenshot library is not loaded.');
    }

    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
    }

    if (needMath && window.MathJax && typeof MathJax.typesetPromise === 'function') {
        await MathJax.typesetPromise([node]).catch(console.error);
    }

    await waitForImagesInNode(node);
    await new Promise(resolve => requestAnimationFrame(resolve));

    return await domtoimage.toBlob(node, {
        bgcolor: '#ffffff',
        style: {
            transform: 'none'
        }
    });
}

async function captureNodeAndShare(node, button, options = {}) {
    const {
        title = 'Screenshot',
        fileName = 'screenshot.png',
        needMath = true
    } = options;

    const originalHtml = button ? button.innerHTML : '';

    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        }

        const blob = await captureNodeToBlob(node, { needMath });
        await shareImageBlob(blob, {
            fileName,
            successMessage: '✅ Screenshot copied to clipboard.'
        });
    } catch (error) {
        console.error(`Failed to generate ${title}:`, error);
        alert('Failed to generate screenshot. Please check the console for details.');
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = originalHtml;
        }
    }
}

function addNewsShareButtons(targetId = 'news-md') {
    const container = document.getElementById(targetId);
    if (!container) return;

    const entries = container.querySelectorAll('.news-entry');
    entries.forEach((entry) => {
        if (entry.querySelector('.news-share-btn')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'news-share-btn';
        btn.setAttribute('aria-label', 'Share this news');
        btn.innerHTML = '<i class="bi bi-share"></i>';

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await captureNodeAndShare(entry, btn, {
                title: 'News Screenshot',
                fileName: 'news.png',
                needMath: true
            });
        });

        entry.appendChild(btn);
    });
}


async function updateHomeNews() {
    const target = document.getElementById('home-current-news');
    if (!target) return;

    try {
        // Read all news from news.md
        const response = await fetch('contents/news.md', {
            cache: 'no-cache'
        });

        if (!response.ok) {
            throw new Error('Failed to load news.md');
        }

        const markdown = await response.text();

        // Convert Markdown into HTML
        const source = document.createElement('div');
        source.innerHTML = marked.parse(markdown);

        const now = Date.now();

        // Find news entries with valid future expiration times
        const available = Array.from(
            source.querySelectorAll('.news-entry[data-expires]')
        )
        .map(entry => ({
            entry: entry,
            expires: Date.parse(entry.dataset.expires)
        }))
        .filter(item =>
            Number.isFinite(item.expires) &&
            item.expires > now
        )
        .sort((a, b) => a.expires - b.expires);

        // No active news
        if (available.length === 0) {
            target.textContent =
                'There are currently no upcoming announcements.';
            return;
        }

        // Select the news item with the nearest expiration time
        
const selected = available[0].entry;

// 1. Only copy paragraphs, not the news heading.
const paragraphs = Array.from(selected.children)
    .filter(element => element.tagName === 'P')
    .map(element => element.cloneNode(true));

target.replaceChildren(...paragraphs);

// 2. Add line breaks before Zoom ID and Password
// only in the homepage copy.
const labelsToBreak = new Set(['Zoom ID:', 'Password:']);

target.querySelectorAll('strong').forEach(label => {
    if (!labelsToBreak.has(label.textContent.trim())) {
        return;
    }

    // Remove unnecessary spaces before the new line.
    const previous = label.previousSibling;
    if (previous && previous.nodeType === Node.TEXT_NODE) {
        previous.textContent = previous.textContent.replace(
            /[\s\u00a0]+$/g, ''
        );
    }

    // Start this field on a new line.
    label.before(document.createElement('br'));
});

    } catch (error) {
        console.error('Home news loading error:', error);
        target.textContent =
            'News is temporarily unavailable.';
    }
}

/* ========================================
   AI Talks - Automatic Video First Frame
   ======================================== */

async function initAiTalkPreviews(root) {

    const previews = Array.from(
        root.querySelectorAll(
            '.ai-video-preview[data-video-id]'
        )
    );

    if (previews.length === 0) return;

    let videoData;

    try {
        const response = await fetch(
            'static/data/videos.json',
            { cache: 'no-store' }
        );

        if (!response.ok) {
            throw new Error('Failed to load videos.json');
        }

        videoData = await response.json();

    } catch (error) {
        console.error('AI video data loading error:', error);
        return;
    }

    function loadPreview(preview) {

        if (preview.dataset.previewLoaded === 'true') {
            return;
        }

        const videoId = preview.dataset.videoId;
        const item = videoData[videoId];

        const video = preview.querySelector('video');

        if (!item || !item.mp4 || !video) {
            console.error('Video not found:', videoId);
            return;
        }

        preview.dataset.previewLoaded = 'true';

        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';

        // Seek slightly into the video to display its first frame.
        video.addEventListener('loadedmetadata', () => {

            if (
                Number.isFinite(video.duration) &&
                video.duration > 0
            ) {
                try {
                    video.currentTime = Math.min(
                        0.1,
                        video.duration / 2
                    );
                } catch (error) {
                    console.warn(
                        'Unable to seek video preview:',
                        error
                    );
                }
            }

        }, { once: true });

        // Keep the video paused after loading.
        video.addEventListener('loadeddata', () => {
            video.pause();
        }, { once: true });

        video.addEventListener('seeked', () => {
            video.pause();
        });

        video.addEventListener('error', () => {
            preview.classList.add('ai-video-error');
            console.error('Video preview failed:', videoId);
        }, { once: true });

        video.src = item.mp4;
        video.load();
    }

    // Load the preview only when it approaches the viewport.
    if ('IntersectionObserver' in window) {

        const observer = new IntersectionObserver(
            (entries, currentObserver) => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {
                        loadPreview(entry.target);
                        currentObserver.unobserve(entry.target);
                    }

                });

            },
            {
                rootMargin: '300px 0px'
            }
        );

        previews.forEach(preview => {
            observer.observe(preview);
        });

    } else {

        previews.forEach(loadPreview);

    }
}
