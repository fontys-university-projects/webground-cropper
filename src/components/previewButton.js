/*!
 * FilePondPluginImagePreview 1.6.3
 * Licensed under MIT, https://opensource.org/licenses/MIT/
 * Please visit https://pqina.nl/filepond/ for details.
 */

/* eslint-disable */

const isPreviewableImage = file => /^image/.test(file.type);

/**
 * Image Preview Proxy Plugin
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

        // if this file is previewable it shouldn't be removed immidiately even when instant uploading
        const canPreview =
          query('GET_ALLOW_IMAGE_PREVIEW') &&
          query('GET_IMAGE_PREVIEW_ALLOW_PREVIEW') &&
          isPreviewableImage(file);

        // if the file cannot be previewed it should be removed on revert
        resolve(!canPreview);
      })
  );

  // open previewor when loading a new item
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
          !query('GET_ALLOW_IMAGE_PREVIEW') ||
          !query('GET_IMAGE_PREVIEW_INSTANT_PREVIEW')
        ) {
          resolve(item);
          return;
        }

        // exit if this is not an image
        if (!isPreviewableImage(file)) {
          resolve(item);
          return;
        }

        const createPrevieworResponseHandler = (
          item,
          resolve,
          reject
        ) => userDidConfirm => {
          // remove item
          previewRequestQueue.shift();

          // handle item
          if (userDidConfirm) {
            resolve(item);
          } else {
            reject(item);
          }

          // TODO: Fix, should not be needed to kick the internal loop in case no processes are running
          dispatch('KICK');

          // handle next item!
          requestPreview();
        };

        const requestPreview = () => {
          if (!previewRequestQueue.length) return;

          const { item, resolve, reject } = previewRequestQueue[0];

          dispatch('PREVIEW_ITEM', {
            id: item.id,
            handlePrevieworResponse: createPrevieworResponseHandler(
              item,
              resolve,
              reject
            )
          });
        };

        queuePreviewRequest({ item, resolve, reject });

        if (previewRequestQueue.length === 1) {
          requestPreview();
        }
      })
  );

  // extend item methods
  addFilter('DID_CREATE_ITEM', (item, { query, dispatch }) => {
    item.extend('preview', () => {
      dispatch('PREVIEW_ITEM', { id: item.id });
    });
  });

  const previewRequestQueue = [];
  const queuePreviewRequest = previewRequest => {
    previewRequestQueue.push(previewRequest);
    return previewRequest;
  };

  // called for each view that is created right after the 'create' method
  addFilter('CREATE_VIEW', viewAPI => {
    // get reference to created view
    const { is, view, query } = viewAPI;

    if (!query('GET_ALLOW_IMAGE_PREVIEW')) return;

    const canShowImagePreview = query('GET_ALLOW_IMAGE_PREVIEW');

    // only run for either the file or the file info panel
    const shouldExtendView =
      (is('file-info') && !canShowImagePreview) ||
      (is('file') && canShowImagePreview);

    if (!shouldExtendView) return;

    // no previewor defined, then exit
    const previewor = query('GET_IMAGE_PREVIEW_PREVIEWOR');
    if (!previewor) return;

    // set default FilePond options and add bridge once
    if (!previewor.filepondCallbackBridge) {
      previewor.outputData = true;
      previewor.outputFile = false;
      previewor.filepondCallbackBridge = {
        onconfirm: previewor.onconfirm || (() => {}),
        oncancel: previewor.oncancel || (() => {})
      };
    }

    // opens the previewor, if it does not already exist, it creates the previewor
    const openPreviewor = ({ root, props, action }) => {
      const { id } = props;
      const { handlePrevieworResponse } = action;

      // update previewor props that could have changed
      previewor.cropAspectRatio =
        root.query('GET_IMAGE_CROP_ASPECT_RATIO') || previewor.cropAspectRatio;
      previewor.outputCanvasBackgroundColor =
        root.query('GET_IMAGE_TRANSFORM_CANVAS_BACKGROUND_COLOR') ||
        previewor.outputCanvasBackgroundColor;

      // get item
      const item = root.query('GET_ITEM', id);
      if (!item) return;

      // file to open
      const file = item.file;

      // crop data to pass to previewor
      const crop = item.getMetadata('crop');
      const cropDefault = {
        center: {
          x: 0.5,
          y: 0.5
        },
        flip: {
          horizontal: false,
          vertical: false
        },
        zoom: 1,
        rotation: 0,
        aspectRatio: null
      };

      // size data to pass to previewor
      const resize = item.getMetadata('resize');

      // filter and color data to pass to previewor
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
              height: resize.size.height
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
        markup
      };

      previewor.onconfirm = ({ data }) => {
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
            height: size.height
          };

          if (!(targetSize.width && targetSize.height) && initialSize) {
            targetSize.width = initialSize.width;
            targetSize.height = initialSize.height;
          }

          if (targetSize.width || targetSize.height) {
            metadata.resize = {
              upscale: size.upscale,
              mode: size.mode,
              size: targetSize
            };
          }
        }

        if (markup) {
          metadata.markup = markup;
        }

        // set filters and colors so we can restore them when re-previewing the image
        metadata.colors = color;
        metadata.filters = filter;

        // set merged color matrix to use in preview plugin
        metadata.filter = colorMatrix;

        // update crop metadata
        item.setMetadata(metadata);

        // call
        previewor.filepondCallbackBridge.onconfirm(data, createItemAPI(item));

        // used in instant preview mode
        if (!handlePrevieworResponse) return;
        previewor.onclose = () => {
          handlePrevieworResponse(true);
          previewor.onclose = null;
        };
      };

      previewor.oncancel = () => {
        // call
        previewor.filepondCallbackBridge.oncancel(createItemAPI(item));

        // used in instant preview mode
        if (!handlePrevieworResponse) return;
        previewor.onclose = () => {
          handlePrevieworResponse(false);
          previewor.onclose = null;
        };
      };

      previewor.open(file, imageParameters);
    };

    /**
     * Image Preview related
     */

    // create the image preview plugin, but only do so if the item is an image
    const didLoadItem = ({ root, props }) => {
      if (!query('GET_IMAGE_PREVIEW_ALLOW_PREVIEW')) return;

      const { id } = props;

      // try to access item
      const item = query('GET_ITEM', id);
      if (!item) return;

      // get the file object
      const file = item.file;

      // exit if this is not an image
      if (!isPreviewableImage(file)) return;

      // handle interactions
      root.ref.handlePreview = e => {
        e.stopPropagation();
        root.dispatch('PREVIEW_ITEM', { id });
      };

      if (canShowImagePreview) {
        // add preview button to preview
        const buttonView = view.createChildView(fileActionButton, {
          label: 'preview',
          icon: query('GET_IMAGE_PREVIEW_ICON_PREVIEW'),
          opacity: 0
        });

        // preview item classname
        buttonView.element.classList.add('filepond--action-preview-item');
        buttonView.element.dataset.align = query(
          'GET_STYLE_IMAGE_PREVIEW_BUTTON_PREVIEW_ITEM_POSITION'
        );
        buttonView.on('click', root.ref.handlePreview);

        root.ref.buttonPreviewItem = view.appendChildView(buttonView);
      } else {
        // view is file info
        const filenameElement = view.element.querySelector(
          '.filepond--file-info-main'
        );
        const previewButton = document.createElement('button');
        previewButton.className = 'filepond--action-preview-item-alt';
        previewButton.innerHTML =
          query('GET_IMAGE_PREVIEW_ICON_PREVIEW') + '<span>preview</span>';
        previewButton.addEventListener('click', root.ref.handlePreview);
        filenameElement.appendChild(previewButton);

        root.ref.previewButton = previewButton;
      }
    };

    view.registerDestroyer(({ root }) => {
      if (root.ref.buttonPreviewItem) {
        root.ref.buttonPreviewItem.off('click', root.ref.handlePreview);
      }
      if (root.ref.previewButton) {
        root.ref.previewButton.removeEventListener('click', root.ref.handlePreview);
      }
    });

    const routes = {
      PREVIEW_ITEM: openPreviewor,
      DID_LOAD_ITEM: didLoadItem
    };

    if (canShowImagePreview) {
      // view is file
      const didPreviewUpdate = ({ root }) => {
        if (!root.ref.buttonPreviewItem) return;
        root.ref.buttonPreviewItem.opacity = 1;
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
      // enable or disable image previewing
      allowImagePreview: [true, Type.BOOLEAN],

      // location of processing button
      styleImagePreviewButtonPreviewItemPosition: ['bottom right', Type.STRING],

      // open previewor when image is dropped
      imagePreviewInstantPreview: [false, Type.BOOLEAN],

      // allow previewing
      imagePreviewAllowPreview: [true, Type.BOOLEAN],

      // the icon to use for the preview button
      imagePreviewIconPreview: [
        '<svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>',
        Type.STRING
      ],

      // previewor object
      imagePreviewPreviewor: [null, Type.OBJECT]
    }
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
