<?php
/**
 * PPOM 스티키 구매 서랍장 (모바일 전용)
 *
 * Code Snippets 플러그인에 "Only run on site front-end" 로 등록해서 사용.
 * 요구사항 반영:
 *   1) 상품(구매) 페이지에서만 하단 고정 "맛 선택/구매하기" 버튼을 노출
 *   2) 액상 이벤트 상품마다 다른 "채우기" 수량을 상품별로 지정 가능
 *   3) 서랍장 UI/UX 개선 (진행률 표시, 스와이프로 닫기, 접근성, 성능)
 */

if (!defined('ABSPATH')) exit;

/* -----------------------------------------------------------------------
 * 0. 상품별 "필수 선택 수량" 설정 필드
 *    - 상품 편집 화면 > 일반 탭에 입력란 추가
 *    - 비워두면(0) 해당 상품은 수량 제한 없이 1개 이상만 선택하면 활성화
 * --------------------------------------------------------------------- */
add_action('woocommerce_product_options_general_product_data', 'vf_drawer_required_qty_field');
function vf_drawer_required_qty_field() {
    woocommerce_wp_text_input([
        'id'                => '_vf_drawer_required_qty',
        'label'             => '서랍장 필수 선택 수량',
        'description'       => '이벤트 액상 수량(예: 3+1=4, 2+3=5)을 입력하면 그 수량 이상 선택해야 구매 버튼이 활성화됩니다. 비워두면 1병 이상 선택 시 바로 활성화됩니다.',
        'desc_tip'          => true,
        'type'              => 'number',
        'custom_attributes' => ['step' => '1', 'min' => '0'],
    ]);
}
add_action('woocommerce_process_product_meta', 'vf_drawer_save_required_qty');
function vf_drawer_save_required_qty($post_id) {
    if (!isset($_POST['_vf_drawer_required_qty'])) return;
    $qty = sanitize_text_field(wp_unslash($_POST['_vf_drawer_required_qty']));
    update_post_meta($post_id, '_vf_drawer_required_qty', $qty === '' ? '' : max(0, (int) $qty));
}

/* -----------------------------------------------------------------------
 * 1. CSS — PPOM 회색 요약 박스 제거 + 2분할 서랍장 UI
 * --------------------------------------------------------------------- */
add_action('wp_head', 'vf_ppom_drawer_css', 9999);
function vf_ppom_drawer_css() {
    if (!function_exists('is_product') || !is_product()) return;
    ?>
    <style id="vf-ppom-drawer-style">
    /* PPOM 기본 가격 요약 박스 제거 */
    .ppom-price-table-wrapper,
    .ppom-option-price-table,
    .ppom-single-option-price,
    .ppom-cart-total,
    .ppom-wrapper .ppom-price-table,
    div[class*="ppom-price"],
    div[class*="ppom-table"],
    table.ppom-price-table {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    @media (max-width: 767px) {
        html.vf-drawer-lock,
        body.vf-drawer-lock {
            overflow: hidden !important;
            height: 100% !important;
            touch-action: none !important;
        }

        /* 서랍장을 사용할 상품에서만 JS가 is-visible 클래스를 붙여준다 */
        .vf-sticky-trigger-bar {
            display: none;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            padding: 10px 16px calc(14px + env(safe-area-inset-bottom, 0px)) 16px;
            background: #ffffff;
            border-top: 1px solid #f2f2f2;
            box-sizing: border-box;
            z-index: 99995;
            box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.06);
        }
        .vf-sticky-trigger-bar.is-visible {
            display: flex;
            align-items: center;
            animation: vf-fade-up 0.25s ease;
        }
        .vf-sticky-trigger-bar button {
            width: 100%;
            height: 50px;
            background: #18181b;
            color: #fff;
            font-size: 15px;
            font-weight: 800;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.15s ease, background 0.15s ease;
        }
        .vf-sticky-trigger-bar button:active {
            transform: scale(0.97);
            background: #000;
        }

        @keyframes vf-fade-up {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .vf-drawer-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(2px);
            z-index: 99997;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.25s ease;
        }
        .vf-drawer-overlay.is-open {
            opacity: 1;
            visibility: visible;
        }

        .woocommerce div.product form.cart {
            position: fixed !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 82vh !important;
            max-height: 82vh !important;
            background: #ffffff !important;
            z-index: 99998 !important;
            box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.2) !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            border-top-left-radius: 22px !important;
            border-top-right-radius: 22px !important;
            overflow: hidden !important;
            transform: translateY(100%) !important;
            transition: transform 0.32s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
            touch-action: pan-y !important;
        }
        .woocommerce div.product form.cart.vf-drawer-open {
            transform: translateY(0) !important;
        }

        .vf-drawer-drag-handle {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            z-index: 3;
            cursor: grab;
            touch-action: none;
        }
        .vf-drawer-drag-handle::after {
            content: '';
            width: 40px;
            height: 5px;
            border-radius: 3px;
            background: #d4d4d8;
        }
        .vf-drawer-close {
            position: absolute;
            top: 6px;
            right: 10px;
            width: 28px;
            height: 28px;
            border: none;
            background: transparent;
            color: #a1a1aa;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
            z-index: 4;
        }

        .vf-drawer-split {
            position: absolute;
            top: 38px;
            bottom: 76px;
            left: 0;
            width: 100%;
            display: flex;
            gap: 10px;
            padding: 8px 14px;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
        }

        .vf-drawer-options {
            width: 58%;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .vf-drawer-summary {
            width: 42%;
            align-self: flex-start;
            background: #f8f8f9;
            border: 1px solid #ececef;
            border-radius: 12px;
            padding: 10px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            min-height: 150px;
            max-height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }

        .vf-summary-title {
            font-size: 11px;
            font-weight: 800;
            color: #71717a;
            text-transform: uppercase;
            border-bottom: 1px solid #e4e4e7;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }

        .vf-progress-track {
            width: 100%;
            height: 5px;
            border-radius: 3px;
            background: #e4e4e7;
            overflow: hidden;
            margin-bottom: 6px;
        }
        .vf-progress-fill {
            height: 100%;
            width: 0%;
            background: #ff5c35;
            border-radius: 3px;
            transition: width 0.25s ease;
        }
        .vf-progress-text {
            font-size: 10.5px;
            font-weight: 700;
            color: #52525b;
            margin-bottom: 8px;
            line-height: 1.4;
        }
        .vf-progress-text.is-ready {
            color: #16a34a;
        }

        .vf-summary-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
        }
        .vf-summary-empty {
            font-size: 11px;
            color: #a1a1aa;
            text-align: center;
            margin-top: 24px;
            line-height: 1.5;
        }
        .vf-summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            font-weight: 700;
            color: #18181b;
            background: #ffffff;
            padding: 6px 8px;
            border-radius: 6px;
            border: 1px solid #e4e4e7;
        }
        .vf-summary-item-qty {
            color: #ff5c35;
            font-weight: 800;
        }

        .ppom-wrapper .ppom-input-select label {
            font-size: 11px;
            font-weight: 800;
            color: #71717a;
            margin-bottom: 4px;
            display: inline-block;
        }
        .ppom-wrapper select {
            width: 100%;
            height: 38px;
            padding: 0 20px 0 10px;
            font-size: 12px;
            font-weight: 700;
            color: #18181b;
            background-color: #f4f4f5;
            border: 1px solid transparent;
            border-radius: 8px;
            outline: none;
            background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            background-size: 12px;
            -webkit-appearance: none;
            appearance: none;
        }

        .vf-drawer-actions {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            height: 76px;
            padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px)) 14px;
            display: flex;
            gap: 8px;
            border-top: 1px solid #f4f4f5;
            background: #ffffff;
            box-sizing: border-box;
            z-index: 3;
        }
        .vf-drawer-actions button,
        .vf-drawer-actions a,
        .woocommerce div.product form.cart .single_add_to_cart_button,
        .woocommerce div.product form.cart .buy_now_button,
        .woocommerce div.product form.cart button {
            flex: 1;
            height: 50px;
            line-height: 50px;
            font-size: 14px;
            font-weight: 800;
            border-radius: 10px;
            border: none;
            text-align: center;
            cursor: pointer;
            box-sizing: border-box;
            margin: 0;
            transition: transform 0.15s ease, opacity 0.15s ease;
            -webkit-tap-highlight-color: transparent;
        }
        .vf-drawer-actions button:active,
        .vf-drawer-actions a:active {
            transform: scale(0.97);
        }

        .woocommerce div.product form.cart .single_add_to_cart_button,
        .woocommerce div.product form.cart button[name="add-to-cart"] {
            background: #3f3f46;
            color: #fff;
        }
        .woocommerce div.product form.cart .buy_now_button,
        .woocommerce div.product form.cart .quick_buy_button,
        .woocommerce div.product form.cart .pay_button,
        .woocommerce div.product form.cart .wd-buy-now-btn,
        .woocommerce div.product form.cart a.checkout-button {
            background: #ff5c35;
            color: #fff;
        }

        .vf-btn-disabled,
        .woocommerce div.product form.cart .single_add_to_cart_button:disabled,
        .woocommerce div.product form.cart button[name="add-to-cart"]:disabled,
        .buy_now_button:disabled,
        .checkout-button:disabled {
            background: #e4e4e7 !important;
            color: #a1a1aa !important;
            cursor: not-allowed !important;
            opacity: 0.6 !important;
            pointer-events: none !important;
        }
        .vf-btn-active {
            opacity: 1 !important;
            pointer-events: auto !important;
            cursor: pointer !important;
        }

        body {
            padding-bottom: 80px !important;
        }
    }
    </style>
    <?php
}

/* -----------------------------------------------------------------------
 * 2. 마크업 — 구매(상품) 페이지에서만 오버레이 + 트리거 바 출력
 * --------------------------------------------------------------------- */
add_action('wp_footer', 'vf_ppom_drawer_markup');
function vf_ppom_drawer_markup() {
    if (!function_exists('is_product') || !is_product()) return;

    global $product;
    $required_qty = 0;
    if ($product instanceof WC_Product) {
        $meta = get_post_meta($product->get_id(), '_vf_drawer_required_qty', true);
        $required_qty = ($meta !== '') ? max(0, (int) $meta) : 0;
    }
    ?>
    <div class="vf-drawer-overlay" id="vf-drawer-overlay"></div>
    <div class="vf-sticky-trigger-bar" id="vf-sticky-trigger-bar">
        <button type="button" id="vf-trigger-mobile-drawer" aria-haspopup="dialog" aria-expanded="false">맛 선택 / 구매하기</button>
    </div>
    <script>window.vfDrawerConfig = { requiredQty: <?php echo (int) $required_qty; ?> };</script>
    <?php
}

/* -----------------------------------------------------------------------
 * 3. JS — 서랍장 구성, 실시간 선택 요약, 필수 수량 기반 활성화
 * --------------------------------------------------------------------- */
add_action('wp_footer', 'vf_ppom_drawer_js', 99);
function vf_ppom_drawer_js() {
    if (!function_exists('is_product') || !is_product()) return;
    ?>
    <script type="text/javascript">
    jQuery(function ($) {
        var $cartForm = $('form.cart').first();
        var $ppomWrapper = $('.ppom-wrapper');
        if (!$cartForm.length || !$ppomWrapper.length) return;

        var $selects = $ppomWrapper.find('select');
        if (!$selects.length) return;

        if ($(window).width() >= 768) return; // 데스크톱은 기존 UI 그대로 사용

        // 필수 선택 수량: 상품별로 다르게 설정 가능 (0이면 1병 이상 선택 시 활성화)
        var REQUIRED_QTY = (window.vfDrawerConfig && window.vfDrawerConfig.requiredQty) || 0;

        var $overlay = $('#vf-drawer-overlay');
        var $triggerBar = $('#vf-sticky-trigger-bar');
        var $triggerBtn = $('#vf-trigger-mobile-drawer');

        // --- 서랍장 골격 구성 (한 번만) ---
        $cartForm.find('.ppom-drawer-close').remove();

        if (!$cartForm.find('.vf-drawer-drag-handle').length) {
            $cartForm.prepend(
                '<div class="vf-drawer-drag-handle" role="button" aria-label="서랍장 닫기"></div>' +
                '<button type="button" class="vf-drawer-close" aria-label="닫기">&times;</button>'
            );
        }

        if (!$cartForm.find('.vf-drawer-split').length) {
            var splitHtml =
                '<div class="vf-drawer-split">' +
                '  <div class="vf-drawer-options"></div>' +
                '  <div class="vf-drawer-summary">' +
                '    <div class="vf-summary-title">선택한 액상 내역</div>' +
                '    <div class="vf-progress-track"><div class="vf-progress-fill" id="vf-progress-fill"></div></div>' +
                '    <div class="vf-progress-text" id="vf-progress-text"></div>' +
                '    <div class="vf-summary-list" id="vf-summary-list"></div>' +
                '  </div>' +
                '</div>';
            $cartForm.find('.vf-drawer-drag-handle').after(splitHtml);
            $ppomWrapper.appendTo($cartForm.find('.vf-drawer-options'));
        }

        if (!$cartForm.find('.vf-drawer-actions').length) {
            $cartForm.append('<div class="vf-drawer-actions"></div>');
            $cartForm.find('button, a.button, input[type="submit"]')
                .not('.qty-btn, .ppom-drawer-close, .vf-drawer-close')
                .not('.vf-drawer-actions *')
                .appendTo($cartForm.find('.vf-drawer-actions'));
        }

        $cartForm.attr({ role: 'dialog', 'aria-modal': 'true', 'aria-hidden': 'true' });

        // 여기까지 왔다는 건 이 상품에 실제 PPOM 옵션이 있다는 뜻 -> 트리거 바 노출
        $triggerBar.addClass('is-visible');

        // --- 열기 / 닫기 ---
        function openDrawer() {
            $cartForm.addClass('vf-drawer-open').attr('aria-hidden', 'false');
            $overlay.addClass('is-open');
            $('html, body').addClass('vf-drawer-lock');
            $triggerBtn.attr('aria-expanded', 'true');
        }
        function closeDrawer() {
            $cartForm.removeClass('vf-drawer-open').attr('aria-hidden', 'true');
            $overlay.removeClass('is-open');
            $('html, body').removeClass('vf-drawer-lock');
            $triggerBtn.attr('aria-expanded', 'false');
        }

        $(document).on('click', '#vf-trigger-mobile-drawer', openDrawer);
        $(document).on('click', '.vf-drawer-drag-handle, .vf-drawer-overlay, .vf-drawer-close', closeDrawer);
        $(document).on('keydown.vfDrawer', function (e) {
            if (e.key === 'Escape' && $cartForm.hasClass('vf-drawer-open')) closeDrawer();
        });
        $overlay.on('touchmove', function (e) { e.preventDefault(); });

        // 드래그 핸들을 아래로 끌면 서랍장 닫기
        var dragStartY = null, dragDelta = 0;
        $cartForm.on('touchstart', '.vf-drawer-drag-handle', function (e) {
            dragStartY = e.originalEvent.touches[0].clientY;
            $cartForm.css('transition', 'none');
        });
        $cartForm.on('touchmove', '.vf-drawer-drag-handle', function (e) {
            if (dragStartY === null) return;
            dragDelta = e.originalEvent.touches[0].clientY - dragStartY;
            if (dragDelta > 0) $cartForm.css('transform', 'translateY(' + dragDelta + 'px)');
        });
        $cartForm.on('touchend', '.vf-drawer-drag-handle', function () {
            $cartForm.css('transition', '').css('transform', '');
            if (dragDelta > 80) closeDrawer();
            dragStartY = null;
            dragDelta = 0;
        });

        // PPOM이 만드는 회색 가격 요약 박스를 생기는 즉시 제거 (폴링 대신 MutationObserver 사용)
        var PRICE_TABLE_SELECTOR = '.ppom-price-table-wrapper, .ppom-option-price-table, [class*="ppom-price"], [class*="ppom-table"]';
        function killPpomPriceTable() {
            $ppomWrapper.find(PRICE_TABLE_SELECTOR).remove();
        }
        if (window.MutationObserver) {
            new MutationObserver(function (mutations) {
                mutations.forEach(function (m) {
                    m.addedNodes && m.addedNodes.forEach(function (node) {
                        if (node.nodeType !== 1) return;
                        if (node.matches && node.matches(PRICE_TABLE_SELECTOR)) {
                            node.remove();
                        } else {
                            $(node).find(PRICE_TABLE_SELECTOR).remove();
                        }
                    });
                });
            }).observe($ppomWrapper[0], { childList: true, subtree: true });
        }

        // --- 선택 내역 요약 + 필수 수량 기반 버튼 활성화 ---
        function updateSummary() {
            killPpomPriceTable();

            var selectedMap = {};
            var totalBottles = 0;

            $selects.each(function () {
                var val = $(this).val();
                var rawText = $(this).find('option:selected').text().trim();
                if (!val || rawText.indexOf('선택') !== -1) return;

                var cleanName = rawText.split('(')[0].replace(/[*:]+/g, '').trim();
                var $qtyInput = $(this).closest('.ppom-input-option').find('input.ppom-quantity, input.qty');
                var itemQty = ($qtyInput.length && parseInt($qtyInput.val(), 10) > 0) ? parseInt($qtyInput.val(), 10) : 1;

                selectedMap[cleanName] = (selectedMap[cleanName] || 0) + itemQty;
                totalBottles += itemQty;
            });

            var $list = $('#vf-summary-list');
            $list.empty();
            if (totalBottles > 0) {
                for (var name in selectedMap) {
                    $list.append(
                        '<div class="vf-summary-item"><span>' + name + '</span>' +
                        '<span class="vf-summary-item-qty">' + selectedMap[name] + '병</span></div>'
                    );
                }
            } else {
                $list.append('<div class="vf-summary-empty">맛을 선택하면<br>여기에 내역이 쌓입니다.</div>');
            }

            var required = REQUIRED_QTY > 0 ? REQUIRED_QTY : 1;
            var ratio = Math.min(totalBottles / required, 1);
            var isReady = totalBottles >= required;

            $('#vf-progress-fill').css('width', (ratio * 100) + '%');
            $('#vf-progress-text')
                .toggleClass('is-ready', isReady)
                .text(
                    isReady
                        ? '구매하기 준비 완료! (' + totalBottles + '병)'
                        : (REQUIRED_QTY > 0
                            ? (required - totalBottles) + '병 더 선택하면 구매할 수 있어요 (' + totalBottles + '/' + required + ')'
                            : '최소 1병 이상 선택해주세요')
                  );

            var $actionBtns = $cartForm.find('.vf-drawer-actions button, .vf-drawer-actions a, .vf-drawer-actions input');
            $actionBtns
                .prop('disabled', !isReady)
                .toggleClass('vf-btn-active', isReady)
                .toggleClass('vf-btn-disabled', !isReady);
        }

        $cartForm.on('change keyup click', '.ppom-wrapper select, .ppom-wrapper input', updateSummary);

        updateSummary();
    });
    </script>
    <?php
}
