import os
import urllib.request
import ssl
from urllib.parse import urlparse

MIME_TYPES = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'webp': 'image/webp', 'mp4': 'video/mp4',
    'mov': 'video/quicktime', 'svg': 'image/svg+xml',
}


def save_to_supabase(file_data, bucket, path, content_type=None, supabase_url=None, supabase_key=None):
    if not supabase_url or not supabase_key:
        return None
    if not content_type:
        ext = path.rsplit('.', 1)[-1].lower() if '.' in path else ''
        content_type = MIME_TYPES.get(ext, 'application/octet-stream')
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        f"{supabase_url}/storage/v1/object/{bucket}/{path}",
        data=file_data,
        headers={
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": content_type,
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=25, context=ctx)
        return f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"
    except Exception as e:
        print(f"UPLOAD FAILED [{bucket}/{path}]: {e}")
        return None


def delete_from_supabase(public_url, supabase_url=None, supabase_key=None):
    if not public_url or not supabase_url or not supabase_key:
        return
    try:
        parsed = urlparse(public_url)
        path = parsed.path
        if not path.startswith('/storage/v1/object/public/'):
            return
        obj_path = path[len('/storage/v1/object/public/'):]
        ctx = ssl.create_default_context()
        req = urllib.request.Request(
            f"{supabase_url}/storage/v1/object/{obj_path}",
            headers={"Authorization": f"Bearer {supabase_key}"},
            method="DELETE",
        )
        urllib.request.urlopen(req, timeout=15, context=ctx)
    except Exception as e:
        print(f"DELETE FROM SUPABASE FAILED [{public_url}]: {e}")
