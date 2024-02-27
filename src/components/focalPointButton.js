const isPreviewableImage = file => /^image/.test(file.type);

/**
 * Image Focal Proxy Plugin
 */
const plugin = _ => {
    const { addFilter, utils, views } = _;
    const { Type, createRoute, createItemAPI = item => item } = utils;
    const { fileActionButton } = views;

    addFilter(
        'SHOULD_REMOVE_ON_REVERT',
        (shouldRemove, { item, query }) =>
            new Promise(resolve => {
                const { file } = item;

                // if this file is focalPointable it shouldn't be removed immidiately even when instant uploading
                const canFocal =
                    query('GET_ALLOW_IMAGE_FOCAL') &&
                    query('GET_IMAGE_FOCAL_ALLOW_FOCAL') &&
                    isPreviewableImage(file);

                // if the file cannot be focalPointed it should be removed on revert
                resolve(!canFocal);
            })
    );

    // open focalPointor when loading a new item
    addFilter(
        'DID_LOAD_ITEM',
        (item, { query, dispatch }) =>
            new Promise((resolve, reject) => {
                // if is temp or local file
                if (item.origin > 1) {
                    resolve(item);
                    return;
                }

                // get file reference
                const { file } = item;
                if (
                    !query('GET_ALLOW_IMAGE_FOCAL') ||
                    !query('GET_IMAGE_FOCAL_INSTANT_FOCAL')
                ) {
                    resolve(item);
                    return;
                }

                // exit if this is not an image
                if (!isPreviewableImage(file)) {
                    resolve(item);
                    return;
                }

                const createPointerResponseHandler = (
                    item,
                    resolve,
                    reject
                ) => userDidConfirm => {
                    // remove item
                    focalPointRequestQueue.shift();

                    // handle item
                    if (userDidConfirm) {
                        resolve(item);
                    } else {
                        reject(item);
                    }

                    // TODO: Fix, should not be needed to kick the internal loop in case no processes are running
                    dispatch('KICK');

                    // handle next item!
                    requestFocal();
                };

                const requestFocal = () => {
                    if (!focalPointRequestQueue.length) return;

                    const { item, resolve, reject } = focalPointRequestQueue[0];

                    dispatch('FOCAL_ITEM', {
                        id: item.id,
                        handlePointerResponse: createPointerResponseHandler(
                            item,
                            resolve,
                            reject
                        ),
                    });
                };

                queueFocalRequest({ item, resolve, reject });

                if (focalPointRequestQueue.length === 1) {
                    requestFocal();
                }
            })
    );

    // extend item methods
    addFilter('DID_CREATE_ITEM', (item, { query, dispatch }) => {
        item.extend('focalPoint', () => {
            dispatch('FOCAL_ITEM', { id: item.id });
        });
    });

    const focalPointRequestQueue = [];
    const queueFocalRequest = focalPointRequest => {
        focalPointRequestQueue.push(focalPointRequest);
        return focalPointRequest;
    };

    // called for each view that is created right after the 'create' method
    addFilter('CREATE_VIEW', viewAPI => {
        // get reference to created view
        const { is, view, query } = viewAPI;

        if (!query('GET_ALLOW_IMAGE_FOCAL')) return;

        const canShowImagePreview = query('GET_ALLOW_IMAGE_PREVIEW');

        // only run for either the file or the file info panel
        const shouldExtendView =
            (is('file-info') && !canShowImagePreview) ||
            (is('file') && canShowImagePreview);

        if (!shouldExtendView) return;

        // no focalPointor defined, then exit
        const focalPointor = query('GET_IMAGE_FOCAL_POINTER');
        if (!focalPointor) return;

        // set default FilePond options and add bridge once
        if (!focalPointor.filepondCallbackBridge) {
            focalPointor.outputData = true;
            focalPointor.outputFile = false;
            focalPointor.filepondCallbackBridge = {
                onconfirm: focalPointor.onconfirm || (() => {}),
                oncancel: focalPointor.oncancel || (() => {}),
            };
        }

        // opens the focalPointor, if it does not already exist, it creates the focalPointor
        const openPointer = ({ root, props, action }) => {
            const { id } = props;
            const { handlePointerResponse } = action;

            // update focalPointor props that could have changed
            focalPointor.cropAspectRatio =
                root.query('GET_IMAGE_CROP_ASPECT_RATIO') ||
                focalPointor.cropAspectRatio;
            focalPointor.outputCanvasBackgroundColor =
                root.query('GET_IMAGE_TRANSFORM_CANVAS_BACKGROUND_COLOR') ||
                focalPointor.outputCanvasBackgroundColor;

            // get item
            const item = root.query('GET_ITEM', id);
            if (!item) return;

            // file to open
            const file = item.file;

            // crop data to pass to focalPointor
            const crop = item.getMetadata('crop');
            const cropDefault = {
                center: {
                    x: 0.5,
                    y: 0.5,
                },
                flip: {
                    horizontal: false,
                    vertical: false,
                },
                zoom: 1,
                rotation: 0,
                aspectRatio: null,
            };

            // size data to pass to focalPointor
            const resize = item.getMetadata('resize');

            // filter and color data to pass to focalPointor
            const filter = item.getMetadata('filter') || null;
            const filters = item.getMetadata('filters') || null;
            const colors = item.getMetadata('colors') || null;
            const markup = item.getMetadata('markup') || null;

            // build parameters object
            const imageParameters = {
                crop: crop || cropDefault,
                size: resize
                    ? {
                          upscale: resize.upscale,
                          mode: resize.mode,
                          width: resize.size.width,
                          height: resize.size.height,
                      }
                    : null,
                filter: filters
                    ? filters.id || filters.matrix
                    : root.query('GET_ALLOW_IMAGE_FILTER') &&
                      root.query('GET_IMAGE_FILTER_COLOR_MATRIX') &&
                      !colors
                    ? filter
                    : null,
                color: colors,
                markup,
            };

            focalPointor.onconfirm = ({ data }) => {
                const { crop, size, filter, color, colorMatrix, markup } = data;

                // create new metadata object
                const metadata = {};

                // append crop data
                if (crop) {
                    metadata.crop = crop;
                }

                // append size data
                if (size) {
                    const initialSize = (item.getMetadata('resize') || {}).size;
                    const targetSize = {
                        width: size.width,
                        height: size.height,
                    };

                    if (
                        !(targetSize.width && targetSize.height) &&
                        initialSize
                    ) {
                        targetSize.width = initialSize.width;
                        targetSize.height = initialSize.height;
                    }

                    if (targetSize.width || targetSize.height) {
                        metadata.resize = {
                            upscale: size.upscale,
                            mode: size.mode,
                            size: targetSize,
                        };
                    }
                }

                if (markup) {
                    metadata.markup = markup;
                }

                // set filters and colors so we can restore them when re-focalPointing the image
                metadata.colors = color;
                metadata.filters = filter;

                // set merged color matrix to use in preview plugin
                metadata.filter = colorMatrix;

                // update crop metadata
                item.setMetadata(metadata);

                // call
                focalPointor.filepondCallbackBridge.onconfirm(
                    data,
                    createItemAPI(item)
                );

                // used in instant focalPoint mode
                if (!handlePointerResponse) return;

                focalPointor.onclose = () => {
                    handlePointerResponse(true);
                    focalPointor.onclose = null;
                };
            };

            focalPointor.oncancel = () => {
                // call
                focalPointor.filepondCallbackBridge.oncancel(createItemAPI(item));

                // used in instant focalPoint mode
                if (!handlePointerResponse) return;
                focalPointor.onclose = () => {
                    handlePointerResponse(false);
                    focalPointor.onclose = null;
                };
            };

            focalPointor.open(file, imageParameters);
        };

        /**
         * Image Preview related
         */

        // create the image focalPoint plugin, but only do so if the item is an image
        const didLoadItem = ({ root, props }) => {
            if (!query('GET_IMAGE_FOCAL_ALLOW_FOCAL')) return;

            const { id } = props;

            // try to access item
            const item = query('GET_ITEM', id);
            if (!item) return;

            // get the file object
            const file = item.file;

            // exit if this is not an image
            if (!isPreviewableImage(file)) return;

            // handle interactions
            root.ref.handleFocal = e => {
                e.stopPropagation();
                root.dispatch('FOCAL_ITEM', { id });
            };

            if (canShowImagePreview) {
                // add focalPoint button to preview
                const buttonView = view.createChildView(fileActionButton, {
                    label: 'focalPoint',
                    icon: query('GET_IMAGE_FOCAL_ICON_FOCAL'),
                    opacity: 0,
                });

                // focalPoint item classname
                buttonView.element.classList.add('filepond--action-focalPoint-item');
                buttonView.element.dataset.align = query(
                    'GET_STYLE_IMAGE_FOCAL_BUTTON_FOCAL_ITEM_POSITION'
                );
                buttonView.on('click', root.ref.handleFocal);

                root.ref.buttonFocalItem = view.appendChildView(buttonView);
            } else {
                // view is file info
                const filenameElement = view.element.querySelector(
                    '.filepond--file-info-main'
                );
                const focalPointButton = document.createElement('button');
                focalPointButton.className = 'filepond--action-focalPoint-item-alt';
                focalPointButton.innerHTML =
                    query('GET_IMAGE_FOCAL_ICON_FOCAL') + '<span>focalPoint</span>';
                focalPointButton.addEventListener('click', root.ref.handleFocal);
                filenameElement.appendChild(focalPointButton);

                root.ref.focalPointButton = focalPointButton;
            }
        };

        view.registerDestroyer(({ root }) => {
            if (root.ref.buttonFocalItem) {
                root.ref.buttonFocalItem.off('click', root.ref.handleFocal);
            }
            if (root.ref.focalPointButton) {
                root.ref.focalPointButton.removeEventListener(
                    'click',
                    root.ref.handleFocal
                );
            }
        });

        const routes = {
            FOCAL_ITEM: openPointer,
            DID_LOAD_ITEM: didLoadItem,
        };

        if (canShowImagePreview) {
            // view is file
            const didPreviewUpdate = ({ root }) => {
                if (!root.ref.buttonFocalItem) return;
                root.ref.buttonFocalItem.opacity = 1;
            };

            routes.DID_IMAGE_PREVIEW_SHOW = didPreviewUpdate;
        } else {
        }

        // start writing
        view.registerWriter(createRoute(routes));
    });

    // Expose plugin options
    return {
        options: {
            // enable or disable image focalPointing
            allowImageFocal: [true, Type.BOOLEAN],

            // location of processing button
            styleImageFocalButtonFocalItemPosition: [
                'bottom left',
                Type.STRING,
            ],

            // open focalPointor when image is dropped
            imageFocalInstantFocal: [false, Type.BOOLEAN],

            // allow focalPointing
            imageFocalAllowFocal: [true, Type.BOOLEAN],

            // the icon to use for the focalPoint button
            imageFocalIconFocal: [
                '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z"/>  <circle cx="12" cy="12" r=".5" fill="currentColor" />  <circle cx="12" cy="12" r="7" />  <line x1="12" y1="3" x2="12" y2="5" />  <line x1="3" y1="12" x2="5" y2="12" />  <line x1="12" y1="19" x2="12" y2="21" />  <line x1="19" y1="12" x2="21" y2="12" /></svg>',
                Type.STRING,
            ],

            // focalPointor object
            imageFocalPointer: [null, Type.OBJECT],
        },
    };
};

// fire pluginloaded event if running in browser, this allows registering the plugin when using async script tags
const isBrowser =
    typeof window !== 'undefined' && typeof window.document !== 'undefined';
if (isBrowser) {
    document.dispatchEvent(
        new CustomEvent('FilePond:pluginloaded', { detail: plugin })
    );
}

export default plugin;