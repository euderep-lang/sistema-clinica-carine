import{bx as m,s as l}from"./index-sjYgRqQ-.js";const i="clinicos-letterhead-print";function u(){let t=document.getElementById(i);return t||(t=document.createElement("style"),t.id=i,document.head.appendChild(t)),t}async function w(t){if(!t){window.print();return}const e=await m(t);if(!e.path){window.print();return}const{data:n,error:a}=await l.storage.from("professional-assets").createSignedUrl(e.path,120);if(a||!n?.signedUrl){window.print();return}const r=u(),{top:o,right:s,bottom:d,left:c}=e.margins;r.textContent=`
    @media print {
      @page { margin: ${o}mm ${s}mm ${d}mm ${c}mm; }
      html, body {
        background: url("${n.signedUrl}") no-repeat center center / 100% 100% !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;const p=()=>{r.textContent=""};window.addEventListener("afterprint",p,{once:!0}),window.print()}export{w as p};
