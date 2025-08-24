export type FileUpload = File & {
  uploadingProgress: number;
  isGallery?: boolean;
};

export type FileUploadResponse = { id: string; name: string };

export type FileMetaData = {
  id: string;
  name: string;
  size: string;
  isGallery?: boolean;
};

export type FileListItem = FileUpload | (FileMetaData & { deleted?: boolean });
