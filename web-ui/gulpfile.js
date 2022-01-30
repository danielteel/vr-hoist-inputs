const gulp = require('gulp');
const replace = require('gulp-replace');
const inlinesource = require('gulp-inline-source')
const path = require('path');
const fs = require('fs');


const buildDir = __dirname+path.sep+'build'+path.sep;   //Customize this to meet your needs
const buildFileName = "index.html";                     //and this one as well
const finalBuildName = "index.html";


const fileRegEx = /["']\/?([\w-// /.]+\.(ico|png|jpg|jpeg|svg|json))["']/gi
const urlRegEx =/url\((?!['"]?(?:data|http|https):)['"]?([^'"\)]*)['"]?\)/gi
const reactFix = /([a-z])\.([a-z])\+\"data:/gi
const mapEx =  /# sourceMappingURL=[a-zA-Z0-9.]*\.map/gi


function fileToURL(fileName){
    let fileData=fs.readFileSync(fileName);

    let mime;
    let beg='"';
    let end='"';

    switch (path.extname(fileName)){
        case '.ttf':
            mime='font/ttf';
            break;

        case '.eot':
            mime='application/vnd.ms-fontobject';
            break;

        case '.woff':
            mime='font/woff';
            break;

        case '.woff2':
            mime='font/woff2';
            break;

        case '.ico':
            mime='image/x-icon';
            break;

        case '.png':
            mime= 'image/png';
            break;

        case '.jpeg':
        case '.jpg':
            mime= 'image/jpeg';
            break;

        case '.svg':
            mime='image/svg+xml';
            break;

        case '.json':
            mime='application/json';
            fileData=Buffer.from(fileData.toString().replace(fileRegEx,   (match, p1, offset, string) => {
                                                            const fileName = buildDir+path.normalize(p1)
                                                            console.log("     Inlined inside json "+fileName);

                                                            return fileToURL(fileName, false);
                                                        }
            ))
            break;

        default:
            console.log("Unknown "+path.extname(fileName));
            mime= '@file/octet-stream';
            break;
    }


    return beg+'data:'+mime+';base64,'+fileData.toString('base64')+end;
}

gulp.task('postbuild', async ()=>{
    console.log("Compiling everything into just "+buildFileName)
    await gulp.src(buildDir+buildFileName)
        .pipe(replace('.js"></script>', ()=>{console.log("Inlining script"); return '.js" inline></script>';}))
        .pipe(replace('rel="stylesheet">',  ()=>{console.log("Inlining stylesheet"); return 'rel="stylesheet" inline>';}))
        .pipe(inlinesource({
            compress: true,
            ignore:['png']
        }))
        .pipe(replace(mapEx, (match)=>{console.log("Removed source mapping "+match);return "";}))

        //Replace ico|png|jpg|jpeg|svg|json with the binaries
        .pipe(replace(fileRegEx,   (match, p1) => {
                                                            const fileName = path.normalize(buildDir+path.normalize(p1));
                                                            console.log("Inlined "+fileName);

                                                            return fileToURL(fileName);
                                                        }
        ))
        
        //Fix up stuff, if weird errors happen, look here
        .pipe(replace(reactFix, (match, p1 ,p2)=>{console.log("Replaced '"+p1+'.'+p2+"+\"data:', if weird things happen, look here ");return p1+'.'+p2+'.substr(1)+"data:';}))
        

        //Replace the css local url's with its binary
        .pipe(replace(urlRegEx,     (match, p1) => {
                                        if (p1.includes('?')) p1=p1.substr(0,p1.indexOf('?'));
                                        if (p1.includes('#')) p1=p1.substr(0,p1.indexOf('#'));
                                        const fileName = path.normalize(buildDir+path.normalize(p1));
                                        console.log("Inlined "+fileName);
                                        return "url("+fileToURL(fileName)+")";
                                    }
        ))
        .pipe(gulp.dest('./build'))
})

gulp.task('rename', async () => {
    await fs.rename(buildDir+buildFileName, buildDir+finalBuildName, ()=>{
        console.log("Renamed "+buildFileName+" to "+finalBuildName);
    });
})