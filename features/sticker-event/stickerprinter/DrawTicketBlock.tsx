import React, { useCallback } from 'react';
import { TicketDrawData } from './types';
import { useContentEditable } from './useContentEditable';
import { sanitizeTicketHtml, sanitizeTicketHtmlForDisplay } from './ticketSanitize';

interface DrawTicketBlockProps {
    ticket: TicketDrawData;
    firstTicket?: TicketDrawData;
    onChange: (updates: Partial<TicketDrawData>) => void;
    index: number;
    drawContentTopLeftSize?: number;
    drawContentTopRightSize?: number;
    drawContentBottomLeftSize?: number;
    drawContentBottomRightSize?: number;
    drawTitleSize?: number;
    drawCodeSize?: number;
    drawFooterSize?: number;
    activeField?: string;
    setActiveField?: (field: string) => void;
    isAutoIncrement?: boolean;
    totalIndex?: number;
}

export const DrawTicketBlock: React.FC<DrawTicketBlockProps> = React.memo(({
    ticket,
    firstTicket,
    onChange,
    index,
    drawContentTopLeftSize,
    drawContentTopRightSize,
    drawContentBottomLeftSize,
    drawContentBottomRightSize,
    drawTitleSize,
    drawCodeSize,
    drawFooterSize,
    activeField,
    setActiveField,
    isAutoIncrement,
    totalIndex
}) => {
    const handleTitleChange = useCallback((text: string) => {
        onChange({ title: text });
    }, [onChange]);

    const handleCodeChange = useCallback((text: string) => {
        onChange({ code: text });
    }, [onChange]);

    const handleFooterChange = useCallback((text: string) => {
        onChange({ footer: text });
    }, [onChange]);

    const handleContentTopChange = useCallback((text: string) => {
        onChange({ contentTop: text });
    }, [onChange]);

    const handleContentBottomChange = useCallback((text: string) => {
        onChange({ contentBottom: text });
    }, [onChange]);

    const handleContentTopRightChange = useCallback((text: string) => {
        onChange({ contentTopRight: text });
    }, [onChange]);

    const handleContentBottomRightChange = useCallback((text: string) => {
        onChange({ contentBottomRight: text });
    }, [onChange]);

    const titleEditable = useContentEditable(ticket.title, handleTitleChange, true);
    const codeEditable = useContentEditable(ticket.code, handleCodeChange, true);
    const footerEditable = useContentEditable(ticket.footer, handleFooterChange, true);
    const contentTopEditable = useContentEditable(ticket.contentTop || '', handleContentTopChange, true);
    const contentTopRightEditable = useContentEditable(ticket.contentTopRight || '', handleContentTopRightChange, true);
    const contentBottomEditable = useContentEditable(ticket.contentBottom || '', handleContentBottomChange, true);
    const contentBottomRightEditable = useContentEditable(ticket.contentBottomRight || '', handleContentBottomRightChange, true);

    const isFirst = totalIndex !== undefined ? totalIndex === 0 : index === 0;
    const activeFirstTicket = firstTicket || ticket;

    return (
        <div className="draw-ticket-block" data-index={index}>
            {/* Title Single */}
            {isFirst ? (
                <div
                    ref={titleEditable.ref}
                    onInput={titleEditable.handleInput}
                    onClick={() => setActiveField?.('drawTitle')}
                    contentEditable
                    suppressContentEditableWarning
                    className={`input-title-single animate-pulse-once ${activeField === 'drawTitle' ? 'active-field' : ''}`}
                    style={{ fontSize: `${Math.min(drawTitleSize || 2.5, 3.0)}cqw` }}
                    data-placeholder="Nhập tiêu đề..."
                />
            ) : (
                <div
                    className="input-title-single"
                    style={{ fontSize: `${Math.min(drawTitleSize || 2.5, 3.0)}cqw`, pointerEvents: 'none', userSelect: 'none' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.title) }}
                />
            )}

            {/* Content Top Left */}
            {isFirst ? (
                <div
                    ref={contentTopEditable.ref}
                    onInput={contentTopEditable.handleInput}
                    onClick={() => setActiveField?.('drawContentTopLeft')}
                    contentEditable
                    suppressContentEditableWarning
                    className={`input-content-top-left ${activeField === 'drawContentTopLeft' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawContentTopLeftSize || 3.5}cqw` }}
                    data-placeholder="Nhập thông tin 1 (Họ tên, SĐT...)"
                />
            ) : (
                <div
                    className="input-content-top-left"
                    style={{ fontSize: `${drawContentTopLeftSize || 3.5}cqw`, pointerEvents: 'none', userSelect: 'none' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.contentTop) }}
                />
            )}
            {/* Content Top Right */}
            {isFirst ? (
                <div
                    ref={contentTopRightEditable.ref}
                    onInput={contentTopRightEditable.handleInput}
                    onClick={() => setActiveField?.('drawContentTopRight')}
                    contentEditable
                    suppressContentEditableWarning
                    className={`input-content-top-right ${activeField === 'drawContentTopRight' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawContentTopRightSize || 3.5}cqw` }}
                    data-placeholder="Nhập thông tin 3 (Tự gõ...)"
                />
            ) : (
                <div
                    className="input-content-top-right"
                    style={{ fontSize: `${drawContentTopRightSize || 3.5}cqw`, pointerEvents: 'none', userSelect: 'none' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.contentTopRight) }}
                />
            )}

            {/* Code Left */}
            {isFirst ? (
                isAutoIncrement ? (
                    <div
                        className="display-code-left"
                        style={{ fontSize: `${drawCodeSize || 3.8}cqw` }}
                    >
                        {ticket.code}
                    </div>
                ) : (
                    <div
                        ref={codeEditable.ref}
                        onInput={codeEditable.handleInput}
                        onClick={() => setActiveField?.('drawCode')}
                        contentEditable
                        suppressContentEditableWarning
                        className={`input-code-left ${activeField === 'drawCode' ? 'active-field' : ''}`}
                        style={{ fontSize: `${drawCodeSize || 3.8}cqw` }}
                        data-placeholder="Số"
                    />
                )
            ) : (
                isAutoIncrement ? (
                    <div
                        className="display-code-left"
                        style={{ fontSize: `${drawCodeSize || 3.8}cqw`, pointerEvents: 'none', userSelect: 'none' }}
                    >
                        {ticket.code}
                    </div>
                ) : (
                    <div
                        className="input-code-left"
                        style={{ fontSize: `${drawCodeSize || 3.8}cqw`, pointerEvents: 'none', userSelect: 'none' }}
                    >
                        {ticket.code}
                    </div>
                )
            )}
            {/* Code Right (Syncs automatically) */}
            <div
                className="display-code-right"
                style={{ fontSize: `${drawCodeSize || 3.8}cqw` }}
            >
                {ticket.code}
            </div>

            {/* Content Bottom Left */}
            {isFirst ? (
                <div
                    ref={contentBottomEditable.ref}
                    onInput={contentBottomEditable.handleInput}
                    onClick={() => setActiveField?.('drawContentBottomLeft')}
                    contentEditable
                    suppressContentEditableWarning
                    className={`input-content-bottom-left ${activeField === 'drawContentBottomLeft' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawContentBottomLeftSize || 2.2}cqw` }}
                    data-placeholder="Nhập thông tin 2 (Địa chỉ...)"
                />
            ) : (
                <div
                    className="input-content-bottom-left"
                    style={{ fontSize: `${drawContentBottomLeftSize || 2.2}cqw`, pointerEvents: 'none', userSelect: 'none' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.contentBottom) }}
                />
            )}
            {/* Content Bottom Right */}
            {isFirst ? (
                <div
                    ref={contentBottomRightEditable.ref}
                    onInput={contentBottomRightEditable.handleInput}
                    onClick={() => setActiveField?.('drawContentBottomRight')}
                    contentEditable
                    suppressContentEditableWarning
                    className={`input-content-bottom-right ${activeField === 'drawContentBottomRight' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawContentBottomRightSize || 2.2}cqw` }}
                    data-placeholder="Nhập thông tin 4 (Tự gõ...)"
                />
            ) : (
                <div
                    className="input-content-bottom-right"
                    style={{ fontSize: `${drawContentBottomRightSize || 2.2}cqw`, pointerEvents: 'none', userSelect: 'none' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.contentBottomRight) }}
                />
            )}

            {/* Footer Left */}
            {isFirst ? (
                <div
                    ref={footerEditable.ref}
                    onInput={footerEditable.handleInput}
                    onClick={() => setActiveField?.('drawFooter')}
                    contentEditable
                    suppressContentEditableWarning
                    className={`input-footer-left ${activeField === 'drawFooter' ? 'active-field' : ''}`}
                    style={{ fontSize: `${drawFooterSize || 3.8}cqw` }}
                    data-placeholder="Nhập tên siêu thị..."
                />
            ) : (
                <div
                    className="input-footer-left"
                    style={{ fontSize: `${drawFooterSize || 3.8}cqw`, pointerEvents: 'none', userSelect: 'none' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(activeFirstTicket.footer) }}
                />
            )}
        </div>
    );
});
