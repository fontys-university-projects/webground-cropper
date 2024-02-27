<template>
    <div class="tw-m-auto tw-max-h-full tw-text-center">
        <h1 class="tw-text-base"
            v-if="processingImages">Снимките се обработват, моля изчакайте преди да зададете фокалната точка и техния
            предварителен преглед!</h1>
        <file-pond name="photos"
                   ref="pond"
                   credits=false
                   allowImageEdit=true
                   allowFocalPoint=true
                   allowImagePreview=true
                   allowRevert=false
                   allowDrop=false
                   allowBrowse=false
                   allowPaste=false
                   allowReorder=true
                   allowImageCrop=true
                   imageCropAspectRatio="16:9"
                   stylePanelAspectRatio='16:9'
                   allowImageTransform=true
                   imageTransformClientTransforms="crop"
                   :imageEditEditor="editor"
                   :imageFocalPointer="focalPointer"
                   :imagePreviewPreviewor="imagePreview"
                   maxParallelUploads=1
                   allowFileSizeValidation=true
                   data-allow-reorder=true
                   allowMultiple=true
                   labelIdle="
                   <div style='display: none'></div>"
                   labelMaxFileSizeExceeded="Maximum image size exceeded"
                   labelMaxFileSize="Maximum image size is {filesize}"
                   allowFileTypeValidation=true
                   acceptedFileTypes="image/jpeg, image/png, image/webp"
                   labelFileTypeNotAllowed="Image type not allowed"
                   fileValidateTypeLabelExpectedTypes="Expects {allButLastType} or {lastType}"
                   instantUpload=true
                   @init="handleFilePondInit"
                   @removefile="processRemoval"
                   @addfile="processedUpload"
                   @reorderfiles="reorderFiles" />

        <TransitionRoot as="template"
                        :show="openCropper">
            <Dialog as="div"
                    class="tw-relative tw-z-10">
                <TransitionChild as="template"
                                 enter="tw-ease-out tw-duration-300"
                                 enter-from="tw-opacity-0"
                                 enter-to="tw-opacity-100"
                                 leave="tw-ease-in tw-duration-200"
                                 leave-from="tw-opacity-100"
                                 leave-to="tw-opacity-0">
                    <div class="tw-fixed tw-inset-0 tw-transition-opacity tw-bg-opacity-75 tw-bg-neutral-500" />
                </TransitionChild>

                <div class="tw-fixed tw-inset-0 tw-z-10 tw-overflow-y-auto">
                    <div
                         class="tw-flex tw-items-end tw-justify-center tw-min-h-full tw-p-4 tw-text-center sm:tw-items-center sm:tw-p-0">
                        <TransitionChild as="template"
                                         enter="tw-ease-out tw-duration-300"
                                         enter-from="tw-opacity-0 tw-translate-y-4 sm:tw-translate-y-0 sm:tw-scale-95"
                                         enter-to="tw-opacity-100 tw-translate-y-0 sm:tw-scale-100"
                                         leave="tw-ease-in tw-duration-200"
                                         leave-from="tw-opacity-100 tw-translate-y-0 sm:tw-scale-100"
                                         leave-to="tw-opacity-0 tw-translate-y-4 sm:tw-translate-y-0 sm:tw-scale-95">
                            <DialogPanel
                                         class="tw-relative tw-px-4 tw-pt-5 tw-pb-4 tw-overflow-hidden tw-text-left tw-transition-all tw-transform tw-bg-white tw-rounded-lg tw-shadow-xl sm:tw-my-8 sm:tw-w-full sm:tw-max-w-xl md:tw-max-w-2xl lg:tw-max-w-4xl xl:tw-max-w-6xl sm:tw-p-6">
                                <div>
                                    <cropper ref="cropper"
                                             class="cropper"
                                             :stencil-component="$options.components.RectangleStencil"
                                             image-restriction="stencil"
                                             :resize-image="{
                                                 adjustStencil: false,
                                             }"
                                             :stencil-props="{
                                                 handlers: {},
                                                 movable: true,
                                                 resizable: true,
                                                 aspectRatio: 16 / 9,
                                             }"
                                             :src="image" />
                                </div>
                                <div class="tw-flex tw-items-center tw-justify-center tw-pt-2 tw-space-x-3">
                                    <div>
                                        <button type="button"
                                                @click="zoom(1.3)"
                                                class="tw-rounded-md tw-bg-primary-600 tw-p-1.5 tw-text-white tw-shadow-sm hover:tw-bg-primary-500 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-primary-600">
                                            <PlusIcon class="tw-w-5 tw-h-5"
                                                      aria-hidden="true" />
                                            <span class="tw-sr-only">Zoom in image</span>
                                        </button>
                                    </div>
                                    <div>
                                        <button type="button"
                                                @click="zoom(0.7)"
                                                class="tw-rounded-md tw-bg-primary-600 tw-p-1.5 tw-text-white tw-shadow-sm hover:tw-bg-primary-500 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-primary-600">
                                            <MinusIcon class="tw-w-5 tw-h-5"
                                                       aria-hidden="true" />
                                            <span class="tw-sr-only">Zoom out image</span>
                                        </button>
                                    </div>
                                    <div>
                                        <button type="button"
                                                @click="flip(true, false)"
                                                class="tw-rounded-md tw-bg-primary-600 tw-p-1.5 tw-text-white tw-shadow-sm hover:tw-bg-primary-500 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-primary-600">
                                            <ArrowsUpDownIcon class="tw-w-5 tw-h-5"
                                                              aria-hidden="true" />
                                            <span class="tw-sr-only">Flip image left to right</span>
                                        </button>
                                    </div>
                                    <div>
                                        <button type="button"
                                                @click="flip(false, true)"
                                                class="tw-rounded-md tw-bg-primary-600 tw-p-1.5 tw-text-white tw-shadow-sm hover:tw-bg-primary-500 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-primary-600">
                                            <ArrowsTopBottomIcon class="tw-w-5 tw-h-5"
                                                                 aria-hidden="true" />
                                            <span class="tw-sr-only">Flip image top to bottom</span>
                                        </button>
                                    </div>
                                    <div>
                                        <button type="button"
                                                @click="cropPicture()"
                                                class="tw-rounded-md tw-bg-primary-600 tw-p-1.5 tw-text-white tw-shadow-sm hover:tw-bg-primary-500 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-primary-600">
                                            <CheckIcon class="w-5 h-5"
                                                       aria-hidden="true" />
                                            <span class="tw-sr-only">Crop image</span>
                                        </button>
                                    </div>
                                    <div>
                                        <button type="button"
                                                @click="cancelEdit()"
                                                class="tw-rounded-md tw-bg-primary-600 tw-p-1.5 tw-text-white tw-shadow-sm hover:tw-bg-primary-500 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-primary-600">
                                            <XMarkIcon class="w-5 h-5"
                                                       aria-hidden="true" />
                                            <span class="tw-sr-only">Cancel</span>
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>
        <TransitionRoot as="template"
                        :show="openFocal">
            <Dialog as="div"
                    class="tw-relative tw-z-10">
                <TransitionChild as="template"
                                 enter="tw-ease-out tw-duration-300"
                                 enter-from="tw-opacity-0"
                                 enter-to="tw-opacity-100"
                                 leave="tw-ease-in tw-duration-200"
                                 leave-from="tw-opacity-100"
                                 leave-to="tw-opacity-0">
                    <div class="tw-fixed tw-inset-0 tw-transition-opacity tw-bg-opacity-75 tw-bg-neutral-500" />
                </TransitionChild>

                <div class="tw-fixed tw-inset-0 tw-z-10 tw-overflow-y-auto">
                    <div
                         class="tw-flex tw-items-end tw-justify-center tw-min-h-full tw-p-4 tw-text-center sm:tw-items-center sm:tw-p-0">
                        <TransitionChild as="template"
                                         enter="tw-ease-out tw-duration-300"
                                         enter-from="tw-opacity-0 tw-translate-y-4 sm:tw-translate-y-0 sm:tw-scale-95"
                                         enter-to="tw-opacity-100 tw-translate-y-0 sm:tw-scale-100"
                                         leave="tw-ease-in tw-duration-200"
                                         leave-from="tw-opacity-100 tw-translate-y-0 sm:tw-scale-100"
                                         leave-to="tw-opacity-0 tw-translate-y-4 sm:tw-translate-y-0 sm:tw-scale-95">
                            <DialogPanel
                                         class="tw-relative tw-px-4 tw-pt-5 tw-pb-4 tw-overflow-hidden tw-text-left tw-transition-all tw-transform tw-bg-white tw-rounded-lg tw-shadow-xl sm:tw-my-8 sm:tw-w-full sm:tw-max-w-xl md:tw-max-w-2xl lg:tw-max-w-4xl xl:max-w-6xl sm:tw-p-6">
                                <div class="tw-relative tw-mb-2">
                                    <h1 class="tw-text-base">Преглед</h1>
                                    <div class="tw-grid tw-grid-cols-2 tw-max-h-80">
                                        <div>
                                            <h1 class="tw-text-base">16:9 размер</h1>
                                            <img :src="croppedImage"
                                                 class="tw-max-h-[300px]"
                                                 alt="Original 16/9" />
                                        </div>
                                        <div>
                                            <h1 class="tw-text-base">4:3 размер (фокусна точка)</h1>
                                            <img :src="preview"
                                                 class="tw-max-h-[300px]"
                                                 alt="Focal point 4/4" />
                                        </div>

                                    </div>
                                </div>
                                <div class="tw-relative tw-pt-2">
                                    <cropper ref="cropper"
                                             class="focal-cropper"
                                             :stencil-component="$options.components.RectangleStencil"
                                             image-restriction="stencil"
                                             :resize-image="false"
                                             :defaultSize="defaultSize"
                                             @change="onChange"
                                             :autoZoom="false"
                                             :stencil-props="{
                                                 handlers: {},
                                                 movable: true,
                                                 resizable: false,
                                                 aspectRatio: 4 / 3,
                                             }"
                                             :src="croppedImage" />
                                </div>
                                <div class="tw-flex tw-items-center tw-justify-center tw-pt-2 tw-space-x-3">
                                    <div>
                                        <button type="button"
                                                @click="setFocalPoint()"
                                                class="tw-rounded-md tw-bg-primary-600 tw-p-1.5 tw-text-white tw-shadow-sm hover:tw-bg-primary-500 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-primary-600">
                                            <CheckIcon class="w-5 h-5"
                                                       aria-hidden="true" />
                                            <span class="tw-sr-only">Focal Pointer</span>
                                        </button>
                                    </div>
                                    <div>
                                        <button type="button"
                                                @click="cancelEdit()"
                                                class="tw-rounded-md tw-bg-primary-600 tw-p-1.5 tw-text-white tw-shadow-sm hover:tw-bg-primary-500 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-primary-600">
                                            <XMarkIcon class="w-5 h-5"
                                                       aria-hidden="true" />
                                            <span class="tw-sr-only">Cancel</span>
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>
        <TransitionRoot as="template"
                        :show="openPreview">
            <Dialog as="div"
                    class="tw-relative tw-z-10">
                <TransitionChild as="template"
                                 enter="tw-ease-out tw-duration-300"
                                 enter-from="tw-opacity-0"
                                 enter-to="tw-opacity-100"
                                 leave="tw-ease-in tw-duration-200"
                                 leave-from="tw-opacity-100"
                                 leave-to="tw-opacity-0">
                    <div class="tw-fixed tw-inset-0 tw-transition-opacity tw-bg-opacity-75 tw-bg-neutral-500" />
                </TransitionChild>

                <div class="tw-fixed tw-inset-0 tw-z-10 tw-overflow-y-auto">
                    <div
                         class="tw-flex tw-items-end tw-justify-center tw-min-h-full tw-p-4 tw-text-center sm:tw-items-center sm:tw-p-0">
                        <TransitionChild as="template"
                                         enter="tw-ease-out tw-duration-300"
                                         enter-from="tw-opacity-0 tw-translate-y-4 sm:tw-translate-y-0 sm:tw-scale-95"
                                         enter-to="tw-opacity-100 tw-translate-y-0 sm:tw-scale-100"
                                         leave="tw-ease-in tw-duration-200"
                                         leave-from="tw-opacity-100 tw-translate-y-0 sm:tw-scale-100"
                                         leave-to="tw-opacity-0 tw-translate-y-4 sm:tw-translate-y-0 sm:tw-scale-95">
                            <DialogPanel
                                         class="tw-relative tw-px-4 tw-pt-5 tw-pb-4 tw-overflow-hidden tw-text-left tw-transition-all tw-transform tw-bg-white tw-rounded-lg tw-shadow-xl sm:tw-my-8 sm:tw-w-full sm:tw-max-w-xl md:tw-max-w-2xl lg:tw-max-w-4xl xl:max-w-6xl sm:tw-p-6">
                                <div class="flex tw-relative tw-mb-2">
                                    <h1 class="tw-text-base">Преглед</h1>
                                    <div class="tw-m-auto">
                                        <h1 class="tw-text-base">16:9 размер</h1>
                                        <div class="tw-flex tw-justify-center tw-items-center">
                                            <img :src="previewData.file"
                                                 class="tw-max-h-[300px]"
                                                 alt="Original 16/9" />
                                        </div>
                                        <h1 class="tw-text-base">4:3 размер (фокална точка)</h1>
                                        <div class="tw-flex tw-justify-center tw-items-center">
                                            <img v-if="previewData.focalPoint" :src="previewData.focalPoint.imageFocalCropped"
                                                 class="tw-max-h-[300px]"
                                                 alt="Focal point 4/4" />
                                            <img v-if="previewData.croppedLink" :src="previewData.croppedLink"
                                                 class="tw-max-h-[300px]"
                                                 alt="Focal point 4/4" />
                                        </div>

                                    </div>
                                </div>
                                <div class="tw-flex tw-items-center tw-justify-center tw-pt-2 tw-space-x-3">
                                    <div>
                                        <button type="button"
                                                @click="openPreview = false"
                                                class="tw-rounded-md tw-bg-primary-600 tw-p-1.5 tw-text-white tw-shadow-sm hover:tw-bg-primary-500 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-primary-600">
                                            <XMarkIcon class="w-5 h-5"
                                                       aria-hidden="true" />
                                            <span class="tw-sr-only">Close</span>
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>
        <div v-for="imageData in imageData">
            <textarea v-if="imageData.croppedLink == null && imageData.focalPoint !== null"
                      name="imageResult[]"
                      :key="imageData.name"
                      :value="JSON.stringify(imageData)"
                      hidden>
        </textarea>
            <input v-if="imageData.croppedLink"
                   type="text"
                   :value="imageData.croppedLink">
            <input v-if="imageData.focalPoint"
                   type="text"
                   :value="imageData.focalPoint.imageFocalCropped">
        </div>
    </div>
</template>
<style>
.cropper {
    height: 80vh;
    width: 100vw;
}

.focal-cropper {
    height: 40vh;
    width: 100vw;
}

@media (min-width: 30em) {
    .filepond--item {
        width: calc(50% - 0.5em);
    }
}

@media (min-width: 50em) {
    .filepond--item {
        width: calc(33.33% - 0.5em);
    }
}

.filepond--wrapper {
    max-height: 100%;

}

.filepond--panel-root {
    height: 100%;
    background-color: transparent;
}

.filepond--drop-label {
    display: none;
}
</style>
<script>
import { Cropper, RectangleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css';
import 'vue-advanced-cropper/dist/theme.classic.css';

import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

import IconFlipHorizontal from './icons/IconFlipHorizontal.vue';
import IconFlipVertical from './icons/IconFlipVertical.vue';
import IconRotateCCW from './icons/IconRotateCCW.vue';
import IconRotateCW from './icons/IconRotateCW.vue';
import IconZoomIn from './icons/IconZoomIn.vue';
import IconZoomOut from './icons/IconZoomOut.vue';
import IconCrop from './icons/IconCrop.vue';
import IconCancel from './icons/IconCancel.vue';

import vueFilePond from "vue-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginImageCrop from 'filepond-plugin-image-crop';
import FilePondPluginImageTransform from 'filepond-plugin-image-transform';
import FilePondPluginImageEdit from 'filepond-plugin-image-edit';
import FilePondPluginFocalPoint from './focalPointButton.js';
import FilePondPluginPreview from './previewButton.js';
import FilePondPluginFileEncode from 'filepond-plugin-file-encode';
import FilePondPluginFileRename from 'filepond-plugin-file-rename';

import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.min.css";
import "./focalPointButton.css";
import "./previewButton.css";
import { ref } from 'vue';

const FilePond = vueFilePond(
    FilePondPluginFileValidateType,
    FilePondPluginFileValidateSize,
    FilePondPluginImagePreview,
    FilePondPluginImageCrop,
    FilePondPluginImageTransform,
    FilePondPluginImageEdit,
    FilePondPluginFocalPoint,
    FilePondPluginPreview,
    FilePondPluginFileEncode,
    FilePondPluginFileRename
);


export default {
    name: "app",
    data: function () {
        let image = null;
        let openCropper = false
        let openFocal = false
        let openPreview = ref(false)
        const editor = {
            open: (file) => {
                var reader = new FileReader();
                reader.onload = async (e) => {
                    this.image = e.target.result
                    this.imageName = file.name
                    let files = this.$refs.pond.getFiles();
                    for (const filep of files) {
                        if (filep.filename === file.name) {
                            this.imageName = filep.filename
                        }
                    }
                    this.openCropper = true
                };
                reader.readAsDataURL(file);
            },
        };
        const focalPointer = {

            open: (file) => {
                var reader = new FileReader();
                reader.onload = async (e) => {
                    this.image = e.target.result
                    this.imageName = file.name
                    for (const files of this.imageData) {
                        if (files.name === file.name) {
                            this.croppedImage = files.file
                        }
                    }
                    this.openFocal = true
                };
                reader.readAsDataURL(file);
            },
        };
        const imagePreview = {

            open: (file) => {
                if (this.processingImages == true) {
                    return
                }
                this.previewData = null
                var reader = new FileReader();
                reader.onload = async (e) => {
                    this.image = e.target.result
                    this.imageName = file.name
                    for (const files of this.imageData) {
                        if (files.name === file.name) {
                            this.previewData = files
                        }
                    }
                    this.openPreview = true
                };
                reader.readAsDataURL(file);
            },
        };
        return {
            data: '',
            imageData: ref(null),
            debug: '',
            editor,
            image,
            croppedImage: ref(null),
            previewData: ref(null),
            croppedLink: null,
            imageFocal: null,
            preview: null,
            imageName: null,
            imageID: null,
            focalPointer,
            openCropper,
            openFocal,
            openPreview,
            processingImages: false,
            imagePreview
        };
    },
    methods: {
        async reorderFiles() {
            let files = this.$refs.pond.getFiles();
            for (let i = 0; i < files.length; i++) {
                for (let j = 0; j < this.imageData.length; j++) {
                    if (files[i].filename === this.imageData[j].name) {
                        this.imageData[j].order = i
                    }
                }

            }

        },
        async processedUpload() {
            function getBase64(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                });
            }

            this.processingImages = true
            // Initialize imageData if not already done

            if (!this.imageData) {
                this.imageData = [];
            }

            await this.$refs.pond.prepareFiles().then(async (files) => {
                if (files.length > 0) {
                    for (let i = 0; i < files.length; i++) {
                        if (this.imageData.find((data) => data.name === files[i].file.name)) {
                            console.log('duplicate')
                        } else {
                            let setFocal = await getBase64(files[i].output)
                            this.imageData.push({
                                name: files[i].file.filename,
                                order: i,
                                imageID: this.imageID,
                                croppedLink: this.croppedLink,
                                file: await getBase64(files[i].output)
                            })
                            this.croppedLink = null
                            this.imageID = null
                        }
                    }
                }
                this.processingImages = false
            })
        },
        async processRemoval() {
            this.$refs.pond.getFiles().map(async (file) => {
                const existingFile = this.imageData.find((data) => data.name === file.filename);
                if (existingFile) {
                    this.imageData = this.imageData.filter((data) => data.name !== file.filename);
                }
            })
        },
        handleFilePondInit: function () {
            // console.log("FilePond has initialized");
            // FilePond instance methods are available on `this.$refs.pond`
            const element = document.querySelector('.filepond--label-action');
        },
        defaultSize({ imageSize, visibleArea }) {
            return {
                width: (visibleArea || imageSize).width,
                height: (visibleArea || imageSize).height,
            };
        },
        onChange({ coordinates, canvas, }) {
            this.coordinates = coordinates;

            // You able to do different manipulations at a canvas
            // but there we just get a cropped image, that can be used 
            // as src for <img/> to preview result
            this.preview = canvas.toDataURL();
        },
        crop() {
            const { canvas } = this.$refs.cropper.getResult();
            // eslint-disable-next-line no-unused-vars
            canvas.toBlob((blob) => {
                // Do something with blob: upload to a server, download and etc.
            }, this.image?.type);
        },
        focal() {
            const { canvas } = this.$refs.cropper.getResult();
            // eslint-disable-next-line no-unused-vars
            canvas.toBlob((blob) => {
                // Do something with blob: upload to a server, download and etc.
            }, this.imageFocal?.type);
        },
        flip(x, y) {
            const { image } = this.$refs.cropper.getResult();
            if (image.transforms.rotate % 180 !== 0) {
                this.$refs.cropper.flip(!x, !y);
            } else {
                this.$refs.cropper.flip(x, y);
            }
        },
        rotate(angle) {
            this.$refs.cropper.rotate(angle);
        },
        zoom(factor) {
            this.$refs.cropper.zoom(factor);
        },
        cropPicture() {
            const { coordinates, image } = this.$refs.cropper.getResult();

            const cropAreaRatio = coordinates.height / coordinates.width

            const percentX = (coordinates.left + coordinates.width / 2) / image.width;
            const percentY = (coordinates.top + coordinates.height / 2) / image.height;

            const cx = percentX > 0.5 ? 1 - percentX : percentX
            const cy = percentY > 0.5 ? 1 - percentY : percentY

            let width = image.width
            let height = width * cropAreaRatio
            if (height > image.height) {
                height = image.height
                width = height / cropAreaRatio
            }
            const rectWidth = cx * 2 * width
            const rectHeight = cy * 2 * height

            /* Calculate zoom. */
            const zoom = Math.max(rectWidth / coordinates.width, rectHeight / coordinates.height)

            this.editor.onconfirm({
                data: {
                    crop: {
                        center: {
                            x: percentX,
                            y: percentY,
                        },
                        flip: {
                            horizontal: image.transforms.flip.horizontal,
                            vertical: image.transforms.flip.vertical,
                        },
                        zoom: zoom,
                        rotation: (Math.PI / 180) * image.transforms.rotate,
                        aspectRatio: cropAreaRatio
                    }
                },
            },
                this.croppedImage = this.$refs.cropper.getResult().canvas.toDataURL(),
                this.openCropper = false,
                this.openFocal = true,
            );
            for (let i = 0; i < this.imageData.length; i++) {
                if (this.imageData[i].name === this.imageName) {
                    this.imageData[i].file = this.croppedImage
                    this.imageData[i].croppedLink = null
                }
            }
            // this.openCropper = false
        },
        setFocalPoint() {

            const findImage = this.imageData.find((data) => data.name === this.imageName);
            const { coordinates, image } = this.$refs.cropper.getResult();
            const cropAreaRatio = coordinates.height / coordinates.width

            const percentX = (coordinates.left + coordinates.width / 2) / image.width;
            const percentY = (coordinates.top + coordinates.height / 2) / image.height;

            const cx = percentX > 0.5 ? 1 - percentX : percentX
            const cy = percentY > 0.5 ? 1 - percentY : percentY

            let width = image.width
            let height = width * cropAreaRatio
            if (height > image.height) {
                height = image.height
                width = height / cropAreaRatio
            }
            const rectWidth = cx * 2 * width
            const rectHeight = cy * 2 * height
            if (findImage) {
                findImage.focalPoint = {
                    x: percentX,
                    y: percentY,
                    cx: cx,
                    cy: cy,
                    rectHeight: rectHeight,
                    rectWidth: rectWidth,
                    imageFocalCropped: this.$refs.cropper.getResult().canvas.toDataURL()
                }
            }
            this.imageFocal = this.$refs.cropper.getResult().canvas.toDataURL();
            this.openCropper = false
            this.openFocal = false
        },
        cancelEdit() {
            this.openCropper = false
            this.openFocal = false
        },
        addFile(data, id, croppedLink) {
            this.$refs.pond.addFile(data)
            this.imageID = id
            this.croppedLink = croppedLink
        }
    },
    mounted() {
        window.addFile = this.addFile

    },
    components: {
        FilePond,
        Cropper,
        // eslint-disable-next-line vue/no-unused-components
        RectangleStencil,
        // eslint-disable-next-line vue/no-reserved-component-names
        Dialog,
        DialogPanel,
        // eslint-disable-next-line vue/no-unused-components
        DialogTitle,
        TransitionChild,
        TransitionRoot,
        PlusIcon: IconZoomIn,
        MinusIcon: IconZoomOut,
        ArrowsTopBottomIcon: IconFlipHorizontal,
        ArrowsUpDownIcon: IconFlipVertical,
        RotateCCWIcon: IconRotateCCW,
        RotateCWIcon: IconRotateCW,
        CheckIcon: IconCrop,
        XMarkIcon: IconCancel,
    },
};
</script>