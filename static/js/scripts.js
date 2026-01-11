

const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'members', 'conferences', 'workshops', 'seminars', 'news']


window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });


    // Yaml
    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                try {
                    document.getElementById(key).innerHTML = yml[key];
                } catch {
                    console.log("Unknown id and value: " + key + "," + yml[key].toString())
                }

            })
        })
        .catch(error => console.log(error));


    // Marked
    marked.use({ mangle: false, headerIds: false })
    section_names.forEach((name, idx) => {
        fetch(content_dir + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                document.getElementById(name + '-md').innerHTML = html;
            }).then(() => {
                // MathJax
                MathJax.typeset();
            })
            .catch(error => console.log(error));
    })

}); 

function formatItemsWithPoster(targetId){
    const section=document.getElementById(targetId);
    if(!section) return;
    
    const html=section.innerHTML.trim().split("<li>").join("<!--split-->").split("<!--split-->");
    let result="";

    html.forEach(block=>{
        const posterMatch = block.match(/Poster:\s*(https?:\/\/[^\s<]+|static\/[^\s<]+)/);
        if(posterMatch){
            const posterUrl = posterMatch[1];
            const cleanBlock = block.replace(/Poster:.*$/, "");
            result += `
            <div class="item-wrapper">
                <div class="item-text">${cleanBlock}</div>
                <img src="${posterUrl}" loading="lazy">
            </div>`;
        }else{
            result+=block;
        }
    });

    section.innerHTML=result;
}

/*** 让它只作用于你三个模块 ***/
formatItemsWithPoster("conferences-md");
formatItemsWithPoster("workshops-md");
formatItemsWithPoster("seminars-md");
