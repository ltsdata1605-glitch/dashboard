interface StickerPreviewStyleParams {
    stickerType: 'gia_soc' | 'gio_vang' | 'draw';
    bgImage: string;
    headerTextSize: number;
    subHeaderTextSize: number;
    percentTextSize: number;
    oldPriceTextSize: number;
    nameTextSize: number;
    newPriceTextSize: number;
    footerTextSize: number;
}

export function getStickerPreviewStyles({
    stickerType, bgImage, headerTextSize, subHeaderTextSize, percentTextSize,
    oldPriceTextSize, nameTextSize, newPriceTextSize, footerTextSize,
}: StickerPreviewStyleParams): string {
    return `
                .sticker-container {
                    width: 100%;
                    aspect-ratio: ${stickerType === 'draw' ? '2482 / 3512' : '197 / 285'};
                    position: relative;
                    background-color: white;
                    background-image: url('${bgImage}');
                    background-position: center;
                    background-size: 100% 100%;
                    background-repeat: no-repeat;
                    overflow: hidden;
                    container-type: inline-size;
                    font-family: 'Arial', sans-serif;
                }

                @media screen {
                    .sticker-container.draw-page {
                        display: none;
                    }
                    .sticker-container.draw-page.active-preview-page {
                        display: block;
                    }
                }
                @media print {
                    .sticker-container.draw-page {
                        display: block !important;
                    }
                }

                .sticker-container > div {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    text-align: center;
                    background: transparent;
                    white-space: nowrap;
                    cursor: text;
                    color: #000;
                    outline: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container .header-text {
                    font-size: ${headerTextSize}cqw;
                    font-weight: 900;
                    top: 4.3%;
                    height: 8.5%;
                    color: white;
                    font-family: 'UTM Avo', sans-serif;
                    text-transform: uppercase;
                    display: ${bgImage === '/frame/X24.png' ? 'none' : 'flex'};
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container .extra1 {
                    font-size: ${percentTextSize}cqw;
                    font-weight: 900 !important;
                    top: 30.9%;
                    height: 25.8%;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .extra1 .discount-amount {
                    display: flex;
                    align-items: baseline;
                    justify-content: center;
                }
                
                .sticker-container .extra1 .discount-label,
                .sticker-container .extra1 .discount-unit {
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                }
                
                .sticker-container .extra1 .discount-label {
                    font-size: calc(1em / 1.5);
                    position: relative;
                    top: -0.18em;
                }
                
                .sticker-container .extra1 .discount-unit.unit-k {
                    font-size: calc(1em / 1.5);
                }
                
                .sticker-container .extra1 .discount-unit.unit-trieu {
                    font-size: calc(1em / 3);
                }
                
                .sticker-container .extra1 .discount-num {
                    font-size: 1em;
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .name {
                    font-size: ${nameTextSize}cqw;
                    font-weight: bold !important;
                    top: 60.8%;
                    height: 4.6%;
                    font-family: 'Alata Regular', sans-serif !important;
                }

                .sticker-container .old {
                    font-size: ${oldPriceTextSize}cqw;
                    font-weight: bold !important;
                    top: 66.6%;
                    height: 9.8%;
                    font-family: 'UTM Avo', sans-serif !important;
                }

                .sticker-container .extra2 {
                    font-size: ${newPriceTextSize}cqw;
                    font-weight: 400 !important;
                    top: 76.5%;
                    height: 21%;
                    right: 24%;
                    left: auto;
                    width: 68%;
                    justify-content: flex-end;
                    letter-spacing: -0.05em;
                    font-family: 'UTM Colossalis', sans-serif !important;
                }

                .sticker-container .barcode {
                    position: absolute;
                    top: 1.5%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 70%;
                    height: 1.4%;
                    display: flex;
                    justify-content: center;
                }
                .sticker-container .barcode img,
                .sticker-container .barcode canvas {
                    height: 100%;
                    width: 100%;
                    object-fit: fill;
                }

                .sticker-container .footer-text {
                    font-size: ${footerTextSize}cqw;
                    font-weight: 900 !important;
                    font-family: 'UTM Avo', sans-serif !important;
                    top: 95.5%;
                    height: 3%;
                    left: 0;
                    width: 100%;
                    color: black;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sticker-container[data-type="gio_vang"] .header-text {
                    font-size: ${headerTextSize}cqw;
                    font-weight: 400;
                    top: 43.5%;
                    height: 8%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-transform: uppercase;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .sticker-container[data-type="gio_vang"] .sub-header {
                    font-size: ${subHeaderTextSize}cqw;
                    font-weight: 400;
                    top: 51.5%;
                    height: 10%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-transform: uppercase;
                    position: absolute;
                    left: 0;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: text;
                    outline: none;
                }
                .sticker-container[data-type="gio_vang"] .name {
                    font-size: ${nameTextSize}cqw;
                    font-weight: bold !important;
                    top: 65.8%;
                    height: 4.5%;
                    color: black;
                    font-family: 'Alata Regular', sans-serif !important;
                }
                .sticker-container[data-type="gio_vang"] .old {
                    font-size: ${oldPriceTextSize}cqw;
                    font-weight: 400 !important;
                    top: 73%;
                    height: 9%;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    text-decoration: line-through;
                    text-decoration-thickness: 3px;
                }
                .sticker-container[data-type="gio_vang"] .extra2 {
                    font-size: ${newPriceTextSize}cqw;
                    font-weight: 400 !important;
                    top: 77%;
                    height: 20%;
                    right: 0;
                    left: 0;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: flex-end;
                    letter-spacing: -0.06em;
                    color: black;
                    font-family: 'UTM Colossalis', sans-serif !important;
                    line-height: 1 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2 span {
                    font-family: 'UTM Colossalis', sans-serif !important;
                    font-weight: 400 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra2::after {
                    content: ".000";
                    font-size: 40%;
                    letter-spacing: normal;
                    font-weight: 400 !important;
                    align-self: flex-end;
                    margin-bottom: 0.08em;
                }
                .sticker-container[data-type="gio_vang"] .extra2 .small-zeros {
                    font-size: 40%;
                    letter-spacing: normal;
                    font-weight: 400 !important;
                }
                .sticker-container[data-type="gio_vang"] .extra1,
                .sticker-container[data-type="gio_vang"] .footer-text {
                    display: none !important;
                }
                 .sticker-container .active-field {
                     outline: 1.5px dashed #6366f1;
                     outline-offset: 1px;
                 }

                 /* Draw Ticket Styles */
                 .draw-ticket-block {
                     position: absolute;
                     width: 100%;
                     height: 25%;
                     left: 0;
                     overflow: hidden;
                 }
                 .draw-ticket-block[data-index="0"] { top: 0%; }
                 .draw-ticket-block[data-index="1"] { top: 25%; }
                 .draw-ticket-block[data-index="2"] { top: 50%; }
                 .draw-ticket-block[data-index="3"] { top: 75%; }

                 .draw-ticket-block .input-title-single {
                       position: absolute;
                       left: 0%;
                       top: 0%;
                       width: 100%;
                       height: 20.0%;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       font-family: 'UTM Avo', sans-serif;
                       font-weight: bold;
                       font-size: 3.6cqw;
                       color: #000;
                       background: transparent;
                       z-index: 10;
                       outline: none;
                       cursor: text;
                       text-align: center;
                       white-space: nowrap;
                       line-height: 1.4;
                  }
 
                  
 
                  .draw-ticket-block .input-content-top-left {
                      position: absolute;
                      left: 2.2%;
                      top: 22.5%;
                      width: 35.0%;
                      height: 23.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                      line-height: 1.15;
                  }
 
                  .draw-ticket-block .input-content-top-right {
                      position: absolute;
                      left: 52.4%;
                      top: 22.5%;
                      width: 35.0%;
                      height: 23.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: flex-start; text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-content-bottom-left {
                      position: absolute;
                      left: 2.2%;
                      top: 49.0%;
                      width: 47.0%;
                      height: 29.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                      line-height: 1.35;
                  }
 
                  .draw-ticket-block .input-content-bottom-right {
                       position: absolute;
                       left: 52.4%;
                       top: 49.0%;
                       width: 45.4%;
                       height: 29.0%;
                       display: flex;
                       flex-direction: column;
                       justify-content: center;
                       align-items: flex-start;
                       text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                  }
 
                  .draw-ticket-block .input-code-left {
                      position: absolute;
                      left: 36.5%;
                      top: 33.0%;
                      width: 12.0%;
                      height: 11%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #000000;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      text-align: center;
                  }

                   .draw-ticket-block .display-code-left {
                       position: absolute;
                       left: 36.5%;
                       top: 33.0%;
                       width: 12.0%;
                       height: 11%;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       font-family: 'UTM Avo', sans-serif;
                       font-weight: bold;
                       font-size: 3.8cqw;
                       color: #000000;
                       text-align: center;
                       pointer-events: none;
                       user-select: none;
                   }
 
                  .draw-ticket-block .display-code-right {
                      position: absolute;
                      left: 86.7%;
                      top: 33.0%;
                      width: 12.0%;
                      height: 11%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #000000;
                      text-align: center;
                      pointer-events: none;
                      user-select: none;
                  }
 
                  .draw-ticket-block .input-footer-left {
                      position: absolute;
                      left: 19.3%;
                      top: 85.8%;
                      width: 28%;
                      height: 10%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #ffffff;
                      background: transparent;
                      outline: none;
                      cursor: text;
                      text-align: center;
                  }

                  .draw-ticket-block .display-title-single {
                       position: absolute;
                       left: 0%;
                       top: 0%;
                       width: 100%;
                       height: 20.0%;
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       font-family: 'UTM Avo', sans-serif;
                       font-weight: bold;
                       font-size: 3.6cqw;
                       color: #000;
                       background: transparent;
                       z-index: 10;
                       text-align: center;
                       white-space: nowrap;
                       line-height: 1.4;
                  }
                  .draw-ticket-block .input-title-single *,
                  .draw-ticket-block .display-title-single * {
                      margin: 0 !important;
                      padding: 0 !important;
                      line-height: 1.4 !important;
                  }

                  .draw-ticket-block .display-content-top-left {
                      position: absolute;
                      left: 2.2%;
                      top: 22.5%;
                      width: 35.0%;
                      height: 23.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: flex-start;
                      align-items: flex-start;
                      text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      white-space: pre-wrap;
                      word-break: break-word;
                      padding: 0.5cqw 1cqw;
                      line-height: 1.15;
                      overflow: hidden;
                  }

                  .draw-ticket-block .display-content-top-right {
                      position: absolute;
                      left: 52.4%;
                      top: 22.5%;
                      width: 35.0%;
                      height: 23.0%;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: flex-start; text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      color: #000;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                      overflow: hidden;
                  }

                   .draw-ticket-block .display-content-bottom-left {
                       position: absolute;
                       left: 2.2%;
                       top: 49.0%;
                       width: 47.0%;
                       height: 29.0%;
                       display: flex;
                       flex-direction: column;
                       justify-content: flex-start;
                       align-items: flex-start;
                       text-align: left;
                       font-family: 'UTM Avo', sans-serif;
                       font-weight: bold;
                       font-size: 2.2cqw;
                       color: #000;
                       white-space: pre-wrap;
                       word-break: break-word;
                       padding: 0.5cqw 1cqw;
                       line-height: 1.35;
                       overflow: hidden;
                   }

                  .draw-ticket-block .display-content-bottom-right {
                       position: absolute;
                       left: 52.4%;
                       top: 49.0%;
                       width: 45.4%;
                       height: 29.0%;
                       display: flex;
                       flex-direction: column;
                       justify-content: center;
                       align-items: flex-start;
                       text-align: left;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 2.2cqw;
                      color: #000;
                      white-space: nowrap;
                      word-break: normal;
                      padding: 0.5cqw 1cqw;
                      overflow: hidden;
                  }

                  .draw-ticket-block .display-footer-left {
                      position: absolute;
                      left: 19.3%;
                      top: 85.8%;
                      width: 28%;
                      height: 10%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'UTM Avo', sans-serif;
                      font-weight: bold;
                      font-size: 3.8cqw;
                      color: #ffffff;
                      text-align: center;
                  }

                  .draw-ticket-block [class^="display-"],
                  .draw-ticket-block [class*=" display-"] {
                      pointer-events: none;
                      user-select: none;
                  }

                 .draw-ticket-block [contenteditable="true"]:hover,
                 .draw-ticket-block [contenteditable="true"]:focus {
                     outline: 1.5px dashed #ef4444 !important;
                     outline-offset: 1px;
                 }

                 .draw-ticket-block [contenteditable="true"]:empty::before {
                     content: attr(data-placeholder);
                     color: #94a3b8;
                     font-style: italic;
                     font-weight: normal;
                 }

                 @media print {
                     .sticker-container.draw-page {
                         display: block !important;
                         width: 210mm !important;
                         height: 297mm !important;
                         position: relative !important;
                         margin: 0 auto !important;
                         page-break-after: always !important;
                     }
                     .draw-ticket-block [contenteditable="true"] {
                         outline: none !important;
                     }
                      .draw-ticket-block [contenteditable="true"]:empty::before {
                          content: "" !important;
                      }
                  }
    `;
}
