import subprocess
import os
import shutil

class FFmpegService:
    @staticmethod
    def get_ffmpeg_binary() -> str:
        """
        Garantiza la localización del binario ffmpeg (sistema o static_ffmpeg bundle).
        """
        try:
            import static_ffmpeg
            static_ffmpeg.add_paths()
        except Exception:
            pass

        found = shutil.which("ffmpeg")
        if found and os.path.exists(found):
            return found

        # Fallbacks adicionales
        possible_paths = [
            "/opt/homebrew/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            "/usr/bin/ffmpeg",
        ]
        for p in possible_paths:
            if os.path.exists(p):
                return p

        return "ffmpeg"

    @staticmethod
    def extract_audio(input_video_path: str, output_audio_path: str):
        """
        Extrae la pista de audio del video original en MP3 optimizado para transcripción.
        """
        ffmpeg_bin = FFmpegService.get_ffmpeg_binary()
        cmd = [
            ffmpeg_bin, "-y",
            "-i", input_video_path,
            "-vn",
            "-acodec", "libmp3lame",
            "-b:a", "128k",
            output_audio_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg extract_audio error: {res.stderr.decode('utf-8', errors='ignore')}")

    @staticmethod
    def cut_clip(
        input_video_path: str,
        output_clip_path: str,
        start_time: float,
        end_time: float,
        aspect_ratio: str = "9:16",
        crop_x_percent: float = 50.0
    ):
        """
        Recorta el segmento exacto. 
        Si aspect_ratio == '9:16', realiza crop vertical con posición horizontal personalizada
        (crop_x_percent: 0.0 izquierda, 50.0 centro, 100.0 derecha).
        """
        ffmpeg_bin = FFmpegService.get_ffmpeg_binary()
        duration = end_time - start_time
        
        # Filtro de video para 9:16 encuadrado o preservación de dimensiones pares
        if aspect_ratio == "9:16":
            ratio = max(0.0, min(100.0, float(crop_x_percent))) / 100.0
            vf_filter = f"crop=w='min(iw,ih*9/16)':h='ih':x='(iw-ow)*{ratio:.4f}':y='0',scale=trunc(iw/2)*2:trunc(ih/2)*2"
        else:
            vf_filter = "scale=trunc(iw/2)*2:trunc(ih/2)*2"

        cmd = [
            ffmpeg_bin, "-y",
            "-ss", str(start_time),
            "-i", input_video_path,
            "-t", str(duration),
            "-vf", vf_filter,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-c:a", "aac",
            output_clip_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg cut_clip error: {res.stderr.decode('utf-8', errors='ignore')}")
