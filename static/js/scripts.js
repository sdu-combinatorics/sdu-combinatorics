const content_dir = 'contents/';
const config_file = 'config.yml';
const section_names = ['home', 'members', 'conferences', 'workshops', 'seminars', 'news'];

window.addEventListener('DOMContentLoaded', () => {
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav && window.bootstrap) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
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

                if (['conferences', 'workshops', 'seminars'].includes(name)) {
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

async function copyBlobToClipboard(blob) {
    if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
        throw new Error('Clipboard image write is not supported.');
    }

    await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
    ]);
}

async function captureNodeToClipboard(node, button, title = 'Screenshot') {
    if (!node) return;

    if (!window.domtoimage) {
        alert('Screenshot library is not loaded.');
        return;
    }

    const originalHtml = button ? button.innerHTML : '';

    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        }

        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
            await MathJax.typesetPromise([node]).catch(console.error);
        }

        await waitForImagesInNode(node);
        await new Promise(resolve => requestAnimationFrame(resolve));

        const blob = await domtoimage.toBlob(node, {
            bgcolor: '#ffffff',
            style: {
                transform: 'none'
            }
        });

        try {
            await copyBlobToClipboard(blob);
            alert('✅ Screenshot copied to clipboard.');
        } catch (err) {
            const url = URL.createObjectURL(blob);
            const win = window.open();
            if (win) {
                win.document.write(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="utf-8">
                        <title>${title}</title>
                        <style>
                            body {
                                margin: 0;
                                padding: 1rem;
                                background: #f5f5f5;
                                text-align: center;
                            }
                            img {
                                max-width: 100%;
                                height: auto;
                                background: #fff;
                                border-radius: 12px;
                                box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15);
                            }
                        </style>
                    </head>
                    <body>
                        <img src="${url}" alt="${title}">
                    </body>
                    </html>
                `);
                win.document.close();
            } else {
                alert('The screenshot was generated, but your browser blocked the new window.');
            }
        }
    } catch (error) {
        console.error('Failed to generate screenshot:', error);
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
            await captureNodeToClipboard(entry, btn, 'News Screenshot');
        });

        entry.appendChild(btn);
    });
}
