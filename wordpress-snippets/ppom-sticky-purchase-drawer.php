<?php
/**
 * PPOM 스티키 구매 서랍장 (모바일 전용)
 *
 * Code Snippets 플러그인에 "Only run on site front-end" 로 등록해서 사용.
 * 요구사항 반영:
 *   1) 상품(구매) 페이지에서만 하단 고정 "맛 선택/구매하기" 버튼을 노출
 *   2) 액상 이벤트 상품마다 다른 "채우기" 수량을 상품별로 지정 가능 (자동 감지)
 *   3) 세로 1열 흐름 + 큰 글씨/버튼 + 버튼에 직접 안내 문구 표시로 UX 개선
 */

if (!defined('ABSPATH')) exit;

/* -----------------------------------------------------------------------
 * 0. 상품별 "필수 선택 수량" 설정 필드 (자동 감지가 틀렸을 때의 수동 보정용)
 * --------------------------------------------------------------------- */
add_action('woocommerce_product_options_general_product_data', 'vf_drawer_required_qty_field');
function vf_drawer_required_qty_field() {
    woocommerce_wp_text_input([
        'id'                => '_vf_drawer_required_qty',
        'label'             => '서랍장 필수 선택 수량',
        'description'       => '보통은 "4가지 맛을 골라주세요" 같은 문구에서 자동으로 인식됩니다. 자동 인식이 틀렸을 때만 여기에 값을 넣어 덮어쓰세요. 비워두면 자동 인식 값을 사용합니다.',
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
 * 1. CSS — PPOM 회색 요약 박스 제거 + 세로 1열 서랍장 UI
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
            height: 54px;
            background: #18181b;
            color: #fff;
            font-size: 16px;
            font-weight: 800;
            border: none;
            border-radius: 12px;
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
            top: max(72px, 14vh) !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
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
            transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1) !important;
            touch-action: pan-y !important;
        }
        .woocommerce div.product form.cart.vf-drawer-open {
            transform: translateY(0) !important;
        }

        /* 헤더: 드래그 핸들 + 제목 + 큼직한 닫기 버튼 (열고닫기를 더 쉽게) */
        .vf-drawer-header {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 54px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            border-bottom: 1px solid #f4f4f5;
            z-index: 5;
            cursor: grab;
            touch-action: none;
        }
        .vf-drawer-header::before {
            content: '';
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 5px;
            border-radius: 3px;
            background: #d4d4d8;
        }
        .vf-drawer-title {
            font-size: 14px;
            font-weight: 800;
            color: #18181b;
        }
        .vf-drawer-close {
            position: absolute;
            top: 7px;
            right: 8px;
            width: 40px;
            height: 40px;
            border: none;
            background: #f4f4f5;
            border-radius: 50%;
            color: #52525b;
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
            z-index: 6;
        }

        /* 본문: 세로 1열 스크롤 (옵션 -> 선택 요약 -> 총액) */
        .vf-drawer-body {
            position: absolute;
            top: 54px;
            bottom: 80px;
            left: 0;
            width: 100%;
            padding: 14px 16px;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
        }

        .vf-drawer-summary {
            margin-top: 16px;
            background: #f8f8f9;
            border: 1px solid #ececef;
            border-radius: 14px;
            padding: 14px;
            box-sizing: border-box;
        }

        .vf-summary-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .vf-summary-title {
            font-size: 13px;
            font-weight: 800;
            color: #52525b;
        }
        .vf-summary-count {
            font-size: 13px;
            font-weight: 800;
            color: #ff5c35;
            background: #fff1ec;
            border-radius: 20px;
            padding: 3px 10px;
        }
        .vf-summary-count.is-ready {
            color: #16a34a;
            background: #e8f8ee;
        }

        .vf-progress-track {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: #e4e4e7;
            overflow: hidden;
            margin-bottom: 10px;
        }
        .vf-progress-fill {
            height: 100%;
            width: 0%;
            background: #ff5c35;
            border-radius: 3px;
            transition: width 0.25s ease;
        }
        .vf-progress-fill.is-ready {
            background: #16a34a;
        }

        .vf-summary-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .vf-summary-empty {
            font-size: 13px;
            color: #a1a1aa;
            text-align: center;
            padding: 16px 0;
            line-height: 1.5;
        }
        .vf-summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            font-weight: 700;
            color: #18181b;
            background: #ffffff;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #e4e4e7;
        }
        .vf-summary-item-qty {
            color: #ff5c35;
            font-weight: 800;
            white-space: nowrap;
        }

        /* [임시 디버그 패널] 원인 파악되면 통째로 제거할 것 */
        .vf-debug-box {
            margin-top: 10px;
            border: 2px dashed #ef4444;
            border-radius: 8px;
            padding: 8px;
            background: #fff5f5;
        }
        .vf-debug-title {
            font-size: 11px;
            font-weight: 800;
            color: #ef4444;
            margin-bottom: 6px;
        }
        .vf-debug-item {
            font-size: 10.5px;
            font-family: monospace;
            color: #3f3f46;
            word-break: break-all;
            padding: 6px 0;
            border-top: 1px dashed #fecaca;
        }
        .vf-debug-item:first-child {
            border-top: none;
        }

        .ppom-wrapper .ppom-input-select label {
            font-size: 13px;
            font-weight: 800;
            color: #3f3f46;
            margin-bottom: 6px;
            display: inline-block;
        }
        .ppom-wrapper select {
            width: 100%;
            height: 48px;
            padding: 0 30px 0 14px;
            font-size: 15px;
            font-weight: 700;
            color: #18181b;
            background-color: #f4f4f5;
            border: 1px solid transparent;
            border-radius: 10px;
            outline: none;
            background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 16px;
            -webkit-appearance: none;
            appearance: none;
        }

        /* PPOM이 선택 항목마다 만드는 기본 수량(+/-) 박스를 서랍장 톤에 맞게, 더 크게 재도색 */
        .ppom-wrapper [class*="selected"],
        .ppom-wrapper [class*="ppom-product"] {
            background: #ffffff;
            border: 1px solid #ececef;
            border-radius: 12px;
            padding: 12px;
            margin-top: 10px;
            box-sizing: border-box;
        }
        .ppom-wrapper .quantity {
            display: inline-flex;
            align-items: center;
            border: 1px solid #e4e4e7;
            border-radius: 10px;
            overflow: hidden;
            background: #ffffff;
        }
        .ppom-wrapper .quantity .minus,
        .ppom-wrapper .quantity .plus,
        .ppom-wrapper button.minus,
        .ppom-wrapper button.plus {
            width: 40px;
            height: 40px;
            border: none;
            background: #f4f4f5;
            color: #3f3f46;
            font-size: 17px;
            font-weight: 800;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
        }
        .ppom-wrapper .quantity input.qty,
        .ppom-wrapper input[type="number"] {
            width: 44px;
            height: 40px;
            border: none;
            text-align: center;
            font-size: 15px;
            font-weight: 800;
            color: #18181b;
            padding: 0;
            -moz-appearance: textfield;
        }
        .ppom-wrapper input[type="number"]::-webkit-inner-spin-button,
        .ppom-wrapper input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .vf-remove-btn {
            color: #a1a1aa;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            padding: 4px 8px;
        }

        .vf-drawer-actions {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            height: 80px;
            padding: 10px 16px calc(14px + env(safe-area-inset-bottom, 0px)) 16px;
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
            height: 56px;
            line-height: 1.25;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 800;
            border-radius: 12px;
            border: none;
            text-align: center;
            cursor: pointer;
            box-sizing: border-box;
            margin: 0;
            padding: 4px 6px;
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
            opacity: 0.85 !important;
            pointer-events: none !important;
            font-size: 13px !important;
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

        // 필요 수량 규칙 감지
        // 1) 상품 메타에 수동으로 값을 넣었으면 "최소 N개 이상" 규칙으로 최우선 사용
        // 2) 없으면 PPOM 필드 문구에서 자동 추출:
        //    - "5병 단위로만 구매 가능" 처럼 "단위"가 붙으면 -> 정확히 N의 배수여야 함
        //    - "4가지 맛을 골라주세요", "13종" 처럼 일반 문구면 -> 최소 N개 이상
        function detectQuantityRule() {
            var text = $ppomWrapper.text();

            var unitMatch = text.match(/(\d+)\s*병\s*단위/);
            if (unitMatch) {
                return { mode: 'multiple', value: parseInt(unitMatch[1], 10) };
            }

            var max = 0;
            var re = /(\d+)\s*(?:가지|종|개입|병입)/g;
            var m;
            while ((m = re.exec(text)) !== null) {
                max = Math.max(max, parseInt(m[1], 10));
            }
            if (max > 0) return { mode: 'atleast', value: max };

            return { mode: 'none', value: 0 };
        }
        var MANUAL_REQUIRED_QTY = (window.vfDrawerConfig && window.vfDrawerConfig.requiredQty) || 0;
        var DETECTED_RULE = detectQuantityRule();
        var RULE_MODE = MANUAL_REQUIRED_QTY > 0 ? 'atleast' : DETECTED_RULE.mode;
        var RULE_VALUE = MANUAL_REQUIRED_QTY > 0 ? MANUAL_REQUIRED_QTY : DETECTED_RULE.value;

        // 상품이 워낙 많고 문구도 제각각이라 위 두 패턴으로 못 잡는 경우가 있을 수 있다.
        // 그런 상품은 상품 편집 화면의 "서랍장 필수 선택 수량"에 값을 넣어 수동으로 덮어쓰면 된다.

        // 이벤트/세트 자체를 고르는 필드(예: "OO 3+1 묶음 이벤트")는 그 자체가 "병"이 아니라
        // 패키지 1개를 고르는 선택이므로, 병수 합산에서는 제외한다.
        var BUNDLE_PICKER_PATTERN = /이벤트|묶음|세트|번들|기획|패키지/;

        // 병수 감지를 tag-agnostic 방식(아래 findQuantityElements)으로 다시 짰으므로 활성화.
        // 만약 또 오작동하면 즉시 false로 내려서 구매 버튼부터 살릴 것.
        var GATE_ENABLED = true;

        var $overlay = $('#vf-drawer-overlay');
        var $triggerBar = $('#vf-sticky-trigger-bar');
        var $triggerBtn = $('#vf-trigger-mobile-drawer');

        // --- 서랍장 골격 구성 (한 번만) ---
        $cartForm.find('.ppom-drawer-close').remove();

        if (!$cartForm.find('.vf-drawer-header').length) {
            $cartForm.prepend(
                '<div class="vf-drawer-header" role="button" aria-label="아래로 끌어서 닫기">' +
                '  <span class="vf-drawer-title">맛 선택하기</span>' +
                '  <button type="button" class="vf-drawer-close" aria-label="닫기">&times;</button>' +
                '</div>'
            );
        }

        if (!$cartForm.find('.vf-drawer-body').length) {
            var bodyHtml =
                '<div class="vf-drawer-body">' +
                '  <div class="vf-drawer-options"></div>' +
                '  <div class="vf-drawer-summary">' +
                '    <div class="vf-summary-head">' +
                '      <span class="vf-summary-title">선택한 액상</span>' +
                '      <span class="vf-summary-count" id="vf-summary-count">0</span>' +
                '    </div>' +
                '    <div class="vf-progress-track"><div class="vf-progress-fill" id="vf-progress-fill"></div></div>' +
                '    <div class="vf-summary-list" id="vf-summary-list"></div>' +
                '  </div>' +
                '</div>';
            $cartForm.find('.vf-drawer-header').after(bodyHtml);
            $ppomWrapper.appendTo($cartForm.find('.vf-drawer-options'));
        }

        if (!$cartForm.find('.vf-drawer-actions').length) {
            $cartForm.append('<div class="vf-drawer-actions"></div>');
            $cartForm.find('button, a.button, input[type="submit"]')
                .not('.qty-btn, .ppom-drawer-close, .vf-drawer-close')
                .not('.vf-drawer-actions *')
                .appendTo($cartForm.find('.vf-drawer-actions'));
        }

        // 버튼이 비활성화됐을 때 "왜 안 눌리는지"를 버튼 자체에 보여주기 위해 원래 문구를 저장
        var $actionBtns = $cartForm.find('.vf-drawer-actions button, .vf-drawer-actions a, .vf-drawer-actions input');
        $actionBtns.each(function () {
            var $el = $(this);
            var original = $el.is('input') ? $el.val() : $el.text();
            $el.data('vfOriginalLabel', original);
        });

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
        $(document).on('click', '.vf-drawer-header, .vf-drawer-overlay, .vf-drawer-close', closeDrawer);
        $(document).on('keydown.vfDrawer', function (e) {
            if (e.key === 'Escape' && $cartForm.hasClass('vf-drawer-open')) closeDrawer();
        });
        $overlay.on('touchmove', function (e) { e.preventDefault(); });

        // 헤더를 아래로 끌면 서랍장 닫기 (헤더 전체가 손잡이라 잡기 쉬움)
        var dragStartY = null, dragDelta = 0;
        $cartForm.on('touchstart', '.vf-drawer-header', function (e) {
            if ($(e.target).is('.vf-drawer-close')) return;
            dragStartY = e.originalEvent.touches[0].clientY;
            $cartForm.css('transition', 'none');
        });
        $cartForm.on('touchmove', '.vf-drawer-header', function (e) {
            if (dragStartY === null) return;
            dragDelta = e.originalEvent.touches[0].clientY - dragStartY;
            if (dragDelta > 0) $cartForm.css('transform', 'translateY(' + dragDelta + 'px)');
        });
        $cartForm.on('touchend', '.vf-drawer-header', function () {
            if (dragStartY === null) return;
            $cartForm.css('transition', '');
            if (dragDelta > 70) {
                closeDrawer();
                $cartForm.css('transform', '');
            } else {
                $cartForm.css('transform', '');
            }
            dragStartY = null;
            dragDelta = 0;
        });

        // PPOM이 만드는 회색 가격 요약 박스를 생기는 즉시 제거 (폴링 대신 MutationObserver 사용)
        var PRICE_TABLE_SELECTOR = '.ppom-price-table-wrapper, .ppom-option-price-table, [class*="ppom-price"], [class*="ppom-table"]';
        function killPpomPriceTable() {
            $ppomWrapper.find(PRICE_TABLE_SELECTOR).remove();
        }
        var summaryRefreshTimer = null;
        function scheduleSummaryRefresh() {
            clearTimeout(summaryRefreshTimer);
            summaryRefreshTimer = setTimeout(function () { updateSummary(); }, 120);
        }

        if (window.MutationObserver) {
            new MutationObserver(function (mutations) {
                var touchedPriceTable = false;
                mutations.forEach(function (m) {
                    m.addedNodes && m.addedNodes.forEach(function (node) {
                        if (node.nodeType !== 1) return;
                        if (node.matches && node.matches(PRICE_TABLE_SELECTOR)) {
                            node.remove();
                            touchedPriceTable = true;
                        } else if ($(node).find(PRICE_TABLE_SELECTOR).length) {
                            $(node).find(PRICE_TABLE_SELECTOR).remove();
                            touchedPriceTable = true;
                        }
                    });
                });
                // PPOM이 항목을 새로 추가/삭제했을 가능성이 있으므로 요약을 다시 계산
                scheduleSummaryRefresh();
                if (touchedPriceTable) killPpomPriceTable();
            }).observe($ppomWrapper[0], { childList: true, subtree: true });
        }

        // 이름이 지저분하게 중복 표기된 PPOM 기본 라벨을 정리
        // 예: "OO 3+1 묶음 이벤트 * *: OO 3+1 묶음 이벤트" -> "OO 3+1 묶음 이벤트"
        //     "4가지 맛을 골라주세요. *: 샤인머스켓" -> "샤인머스켓"
        function cleanLabelText(raw) {
            var text = (raw || '').replace(/\*/g, '');
            if (text.indexOf(':') !== -1) text = text.split(':').pop();
            return text.trim();
        }

        // PPOM이 항목 삭제용으로 넣는 "×" 아이콘을 클래스명과 무관하게 찾아서 스타일 적용
        function tagRemoveButtons() {
            $ppomWrapper.find('*').filter(function () {
                var t = $(this).contents().filter(function () { return this.nodeType === 3; }).text().trim();
                return (t === '×' || t === 'x' || t === 'X') && $(this).children().length === 0;
            }).addClass('vf-remove-btn');
        }

        // --- 선택 내역 요약 + 필수 수량 기반 버튼 활성화 ---
        function updateSummary() {
            killPpomPriceTable();
            tagRemoveButtons();

            var selectedMap = {};
            var totalBottles = 0;

            // PPOM이 선택 항목마다 만드는 수량(+/-) 박스를 우선 집계
            // (드롭다운은 항목을 추가하고 나면 다시 "선택해주세요"로 리셋되기 때문에,
            //  실제 담긴 병 수는 드롭다운 값이 아니라 아래에 쌓인 항목의 수량 스테퍼에서 읽어야 정확하다)
            //
            // 클래스명/태그를 알 수 없으므로(input일 수도, span/div일 수도 있음) 태그에 의존하지 않고
            // "숫자 하나만 들어있고, 바로 옆(앞/뒤)에 −/+ 처럼 보이는 요소가 붙어 있는" 화면상 패턴으로 찾는다
            function elementValue($el) {
                return $el.is('input, textarea') ? ($el.val() || '') : $el.text();
            }
            var MINUS_RE = /^[-−–]$/;
            var PLUS_RE = /^[+＋]$/;

            var $qtyElements = $ppomWrapper.find('*').filter(function () {
                var $el = $(this);
                if ($el.children().length && !$el.is('input, textarea')) return false; // 리프 노드만
                if (!$el.is(':visible')) return false;

                var v = elementValue($el).toString().trim();
                if (!/^\d+$/.test(v)) return false;

                var prevText = $el.prev().length ? elementValue($el.prev()).toString().trim() : '';
                var nextText = $el.next().length ? elementValue($el.next()).toString().trim() : '';
                return MINUS_RE.test(prevText) || PLUS_RE.test(nextText);
            });

            var DEBUG_ITEMS = []; // [임시 디버그] 원인 파악되면 통째로 제거할 것

            if ($qtyElements.length) {
                $qtyElements.each(function () {
                    var $el = $(this);
                    var qty = parseInt(elementValue($el), 10);
                    if (!qty || qty < 0) return;

                    // 수량 요소 자체는 제목이 없을 가능성이 높으므로, 한글이 포함된(제목이 들어있는)
                    // 조상 요소를 찾는다. 실제 마크업이 예상보다 훨씬 깊게 중첩돼 있었으므로
                    // (6단계/글자수 기준으로는 제목까지 못 올라갔음) 훨씬 넉넉하게 $cartForm까지 올려보고,
                    // "글자 수"가 아니라 "한글이 등장하는 순간"을 기준으로 멈춘다 (숫자/기호에는 한글이 없으므로
                    // 제목이 포함되자마자 정확히 그 레벨에서 멈추고, 다른 항목과 섞이기 전에 멈출 수 있다).
                    var $card = $el.parent();
                    for (var i = 0; i < 25 && $card.length && !$card.is($cartForm); i++) {
                        if (/[가-힣]{2,}/.test($card.text())) break;
                        $card = $card.parent();
                    }
                    // "첫 번째 자식 요소"가 아니라, 카드를 복제해서 삭제(×)/수량 위젯(−, 숫자, +)/가격을
                    // 걷어내고 남는 텍스트를 이름으로 쓴다. children().first()로는 title이 텍스트 노드로만
                    // 있을 때 엉뚱하게 "×"나 "−" 버튼을 이름으로 잡아버리는 문제가 있었다.
                    var $cardClone = $card.clone();
                    $cardClone.find('*').filter(function () {
                        var t = $(this).text().trim();
                        return /^[×xX]$/.test(t) || /^[-−–]$/.test(t) || /^[+＋]$/.test(t) ||
                            /^\d+$/.test(t) || /^[\d,]+\s*원$/.test(t);
                    }).remove();
                    var titleSource = $cardClone.text();
                    var name = cleanLabelText(titleSource) || '선택 항목';
                    var isBundle = BUNDLE_PICKER_PATTERN.test(name);

                    selectedMap[name] = (selectedMap[name] || 0) + qty;

                    // "OO 묶음 이벤트" 같은 패키지 선택 자체는 목록에는 보이되 병수로는 세지 않음
                    if (!isBundle) {
                        totalBottles += qty;
                    }

                    // [임시 디버그] 실제로 뭘 읽어오는지 화면에 보여주기 위함
                    DEBUG_ITEMS.push({
                        qty: qty,
                        cardText: $card.text().replace(/\s+/g, ' ').trim(),
                        strippedText: titleSource.replace(/\s+/g, ' ').trim(),
                        cleanedName: name,
                        isBundle: isBundle
                    });
                });
            } else {
                // 수량 스테퍼가 없는 단순 드롭다운형 상품을 위한 대비책
                $ppomWrapper.find('select').each(function () {
                    var val = $(this).val();
                    var rawText = $(this).find('option:selected').text().trim();
                    if (!val || rawText.indexOf('선택') !== -1) return;

                    var cleanName = cleanLabelText(rawText.split('(')[0]);
                    selectedMap[cleanName] = (selectedMap[cleanName] || 0) + 1;
                    totalBottles += 1;
                });
            }

            var $list = $('#vf-summary-list');
            $list.empty();
            if (Object.keys(selectedMap).length) {
                for (var name in selectedMap) {
                    $list.append(
                        '<div class="vf-summary-item"><span>' + name + '</span>' +
                        '<span class="vf-summary-item-qty">' + selectedMap[name] + '개</span></div>'
                    );
                }
            } else {
                $list.append('<div class="vf-summary-empty">맛을 선택하면<br>여기에 내역이 쌓입니다.</div>');
            }

            // [임시 디버그 패널] 원인 파악되면 통째로 제거할 것
            if (DEBUG_ITEMS.length) {
                var debugHtml = '<div class="vf-debug-box"><div class="vf-debug-title">🛠 디버그(임시)</div>';
                DEBUG_ITEMS.forEach(function (d, idx) {
                    debugHtml +=
                        '<div class="vf-debug-item">' +
                        '#' + (idx + 1) + ' qty=' + d.qty + ' bundle=' + d.isBundle + '<br>' +
                        'card: "' + d.cardText + '"<br>' +
                        'stripped: "' + d.strippedText + '"<br>' +
                        'name: "' + d.cleanedName + '"' +
                        '</div>';
                });
                debugHtml += '</div>';
                $list.append(debugHtml);
            }

            var meetsCondition, ratio, countLabel, blockedLabel;

            if (RULE_MODE === 'multiple') {
                // "5병 단위로만 구매 가능" 같은 상품: 정확히 N의 배수여야 함 (5는 되고 6은 안 됨)
                var remainder = totalBottles % RULE_VALUE;
                meetsCondition = totalBottles > 0 && remainder === 0;
                ratio = meetsCondition ? 1 : remainder / RULE_VALUE;
                countLabel = totalBottles + '병 (' + RULE_VALUE + '의 배수)';
                blockedLabel = totalBottles === 0
                    ? '맛을 선택해주세요'
                    : (RULE_VALUE - remainder) + '병 더 담아서 ' + RULE_VALUE + '의 배수로 맞춰주세요';
            } else if (RULE_MODE === 'atleast') {
                meetsCondition = totalBottles >= RULE_VALUE;
                ratio = Math.min(totalBottles / RULE_VALUE, 1);
                countLabel = totalBottles + ' / ' + RULE_VALUE;
                var missing = Math.max(RULE_VALUE - totalBottles, 0);
                blockedLabel = missing > 0 ? (missing + '병 더 담아주세요') : '맛을 선택해주세요';
            } else {
                meetsCondition = totalBottles > 0;
                ratio = meetsCondition ? 1 : 0;
                countLabel = String(totalBottles);
                blockedLabel = '맛을 선택해주세요';
            }

            var isReady = GATE_ENABLED ? meetsCondition : true;

            $('#vf-progress-fill').css('width', (ratio * 100) + '%').toggleClass('is-ready', meetsCondition);
            $('#vf-summary-count').toggleClass('is-ready', meetsCondition).text(countLabel);

            $actionBtns.each(function () {
                var $el = $(this);
                var label = isReady ? $el.data('vfOriginalLabel') : blockedLabel;
                if ($el.is('input')) $el.val(label); else $el.text(label);
            });

            $actionBtns
                .prop('disabled', !isReady)
                .toggleClass('vf-btn-active', isReady)
                .toggleClass('vf-btn-disabled', !isReady);
        }

        // PPOM이 +/- 를 button/a/input 중 무엇으로 만들었는지 알 수 없으므로,
        // 위임 선택자 대신 ppom-wrapper에 직접 바인딩해서 내부에서 버블링되는 모든
        // 클릭/입력 이벤트를 잡는다
        $ppomWrapper.on('click input change keyup', updateSummary);

        // PPOM이 자체 스크립트로 값만 바꾸고 별도 이벤트를 안 쏘는 경우를 대비한 안전망
        setInterval(updateSummary, 500);

        updateSummary();
    });
    </script>
    <?php
}
