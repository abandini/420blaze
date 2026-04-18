#!/bin/bash
# Seed affiliate link KV data
# POTV Refersion approved 2026-04-18, rfsn=9035362.47d69b
# Run: bash seed-affiliate-links.sh

KV_NS_ID="ac17af39fd1147f880a9b2623e812511"

echo "Seeding affiliate links to KV namespace ${KV_NS_ID}..."

# POTV products (15% commission)
wrangler kv key put --namespace-id=$KV_NS_ID "venty" \
  '{"url":"https://www.planetofthevapes.com/products/storz-and-bickel-venty?rfsn=9035362.47d69b","network":"potv-refersion","product":"Storz & Bickel Venty","commission_rate":"15%","avg_price":375}'

wrangler kv key put --namespace-id=$KV_NS_ID "mighty-plus" \
  '{"url":"https://www.planetofthevapes.com/products/mighty-plus-vaporizer?rfsn=9035362.47d69b","network":"potv-refersion","product":"Storz & Bickel Mighty+","commission_rate":"15%","avg_price":275}'

wrangler kv key put --namespace-id=$KV_NS_ID "arizer-solo-3" \
  '{"url":"https://www.planetofthevapes.com/products/arizer-solo-3?rfsn=9035362.47d69b","network":"potv-refersion","product":"Arizer Solo 3","commission_rate":"10%","avg_price":220}'

wrangler kv key put --namespace-id=$KV_NS_ID "potv-lobo" \
  '{"url":"https://www.planetofthevapes.com/products/potv-lobo?rfsn=9035362.47d69b","network":"potv-refersion","product":"POTV Lobo","commission_rate":"15%","avg_price":150}'

wrangler kv key put --namespace-id=$KV_NS_ID "xmax-v3-pro" \
  '{"url":"https://www.planetofthevapes.com/products/xmax-v3-pro?rfsn=9035362.47d69b","network":"potv-refersion","product":"XMAX V3 Pro","commission_rate":"15%","avg_price":100}'

# S&B Direct via AWIN (5% commission) — Volcano excluded from POTV
wrangler kv key put --namespace-id=$KV_NS_ID "volcano-hybrid" \
  '{"url":"https://www.storz-bickel.com/products/volcano-hybrid","network":"awin-sb","product":"Storz & Bickel Volcano Hybrid","commission_rate":"5%","avg_price":600}'

# PAX — no confirmed affiliate program, link direct without tracking
wrangler kv key put --namespace-id=$KV_NS_ID "pax-plus" \
  '{"url":"https://www.pax.com/products/pax-plus","network":"direct","product":"PAX Plus","commission_rate":"0%","avg_price":175}'

wrangler kv key put --namespace-id=$KV_NS_ID "pax-flow" \
  '{"url":"https://www.pax.com/products/pax-flow","network":"direct","product":"PAX Flow","commission_rate":"0%","avg_price":250}'

# Store homepages
wrangler kv key put --namespace-id=$KV_NS_ID "potv-store" \
  '{"url":"https://www.planetofthevapes.com/?rfsn=9035362.47d69b","network":"potv-refersion","product":"POTV Store","commission_rate":"15%"}'

wrangler kv key put --namespace-id=$KV_NS_ID "sb-store" \
  '{"url":"https://www.storz-bickel.com/","network":"awin-sb","product":"S&B Store","commission_rate":"5%"}'

echo ""
echo "Done seeding ${KV_NS_ID}."
echo ""
echo "POTV affiliate links are LIVE with rfsn=9035362.47d69b"
