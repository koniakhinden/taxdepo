// Надёжное декодирование + сжатие изображения на клиенте.
// Работает и на iOS Safari (createImageBitmap с учётом ориентации, фолбэк через <img>).

export async function processImage(file, max = 1600, quality = 0.82) {
  let source = null;
  let sw = 0;
  let sh = 0;

  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
    sw = source.width;
    sh = source.height;
  } catch {
    source = await loadImg(file);
    sw = source.naturalWidth;
    sh = source.naturalHeight;
  }

  if (!sw || !sh) throw new Error('decode failed');

  let width = sw;
  let height = sh;
  if (width > max || height > max) {
    const k = Math.min(max / width, max / height);
    width = Math.round(width * k);
    height = Math.round(height * k);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  if (source.close) source.close();

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  return { dataUrl, blob };
}

function loadImg(file) {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('img load failed'));
    };
    img.src = url;
  });
}
