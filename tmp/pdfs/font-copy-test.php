<?php

require dirname(__DIR__, 2).'/vendor/autoload.php';

$pdf = new Mpdf\Mpdf(['tempDir' => dirname(__DIR__, 2).'/storage/app/private/paper-pdfs/mpdf']);
$pdf->WriteHTML('<div style="font-family:dejavusans;direction:rtl">معروضی سوالات کی جوابی شیٹ</div>');
$pdf->Output(__DIR__.'/dejavu.pdf', 'F');
