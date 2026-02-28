/**
 * reportExporter — common capability for generating and uploading interactive
 * HTML reports to Google Cloud Storage.
 *
 * Usage (from any capability API route):
 *
 *   const exported = await exportReport('surgery', surgicalReport, { businessName: 'Bosphorus' });
 *   // exported?.publicUrl  →  https://storage.googleapis.com/…/report.html
 *   // exported?.gcsPath    →  reports/surgery/bosphorus_1234567890.html
 *
 * The public URL is then:
 *   1. Returned in the API response so the UI can display / link to it
 *   2. Passed to generateAndDraftMarketingContent() so all marketing copy
 *      embeds the link automatically
 *
 * GCS bucket is read from GCS_REPORT_BUCKET env var (set after you confirm the
 * exact bucket name). Defaults to the Firebase default storage bucket pattern.
 *
 * Files are made publicly readable via makePublic() so no signed URLs are needed.
 */
import * as admin from 'firebase-admin';
import { renderSurgeonReportHtml }        from './reportTemplates/surgeonReport';
import { renderTrafficReportHtml }        from './reportTemplates/trafficReport';
import { renderSeoReportHtml }            from './reportTemplates/seoReport';
import { renderCompetitiveReportHtml }    from './reportTemplates/competitiveReport';
import { renderSocialStrategyReportHtml } from './reportTemplates/socialStrategyReport';
import { db } from './firebase';

export type ReportType = 'surgery' | 'traffic' | 'seo' | 'competitive' | 'social-strategy';

export interface ExportMetadata {
    businessName: string;
    /** Additional Firestore document ID to update with the report URL, if any */
    firestoreDocRef?: string;
}

export interface ExportResult {
    publicUrl: string;
    gcsPath: string;
    bucket: string;
    sizeBytes: number;
}

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50);
}

function getBucket(): admin.storage.Bucket {
    const bucketName = process.env.GCS_REPORT_BUCKET ?? `${process.env.FIREBASE_PROJECT_ID ?? 'hephae-co'}.appspot.com`;
    return admin.storage().bucket(bucketName);
}

/**
 * Generate the HTML for any supported report type.
 * The reportUrl passed here is the *expected* final public URL — it gets
 * embedded inside the HTML itself so the "Share this report" link works.
 */
function generateHtml(type: ReportType, data: any, reportUrl: string): string {
    switch (type) {
        case 'surgery':     return renderSurgeonReportHtml(data, reportUrl);
        case 'traffic':     return renderTrafficReportHtml(data, reportUrl);
        case 'seo':         return renderSeoReportHtml(data, reportUrl);
        case 'competitive':     return renderCompetitiveReportHtml(data, reportUrl);
        case 'social-strategy': return renderSocialStrategyReportHtml(data, reportUrl);
        default: throw new Error(`Unknown report type: ${type}`);
    }
}

/**
 * Export a report: generate HTML → upload to GCS → make public → log to Firestore.
 *
 * Returns null (without throwing) if GCS is unavailable, so callers can
 * always treat this as fire-and-forget without crashing the main API response.
 */
export async function exportReport(
    type: ReportType,
    data: any,
    meta: ExportMetadata
): Promise<ExportResult | null> {
    try {
        const bucket   = getBucket();
        const slug     = slugify(meta.businessName);
        const ts       = Date.now();
        const gcsPath  = `reports/${type}/${slug}_${ts}.html`;

        // Compute the public URL before generating HTML so it can be self-referencing
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsPath}`;

        const html      = generateHtml(type, data, publicUrl);
        const htmlBytes = Buffer.from(html, 'utf-8');

        // Upload
        const file = bucket.file(gcsPath);
        await file.save(htmlBytes, {
            contentType: 'text/html; charset=utf-8',
            metadata: {
                cacheControl: 'public, max-age=3600',
                metadata: {
                    businessName: meta.businessName,
                    reportType:   type,
                    generatedAt:  new Date().toISOString(),
                },
            },
        });

        // Make publicly readable (no signed URL needed)
        await file.makePublic();

        const result: ExportResult = {
            publicUrl,
            gcsPath,
            bucket: bucket.name,
            sizeBytes: htmlBytes.length,
        };

        // Log to Firestore report_exports collection
        await db.collection('report_exports').add({
            type,
            businessName:  meta.businessName,
            publicUrl,
            gcsPath,
            bucket:        bucket.name,
            sizeBytes:     htmlBytes.length,
            exportedAt:    new Date(),
        });

        console.log(`[reportExporter] ✅ ${type} report exported → ${publicUrl} (${htmlBytes.length} bytes)`);
        return result;

    } catch (e: any) {
        console.error(`[reportExporter] ❌ Export failed for ${type}/${meta.businessName}:`, e.message);
        return null;
    }
}
