import {
  Box,
  Group,
  Text,
  Title,
  Button,
  SimpleGrid,
  Image,
} from "@mantine/core";
import { useModals } from "@mantine/modals";
import { GetServerSidePropsContext } from "next";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import Meta from "../../../components/Meta";
import DownloadAllButton from "../../../components/share/DownloadAllButton";
import FileList from "../../../components/share/FileList";
import showEnterPasswordModal from "../../../components/share/showEnterPasswordModal";
import showErrorModal from "../../../components/share/showErrorModal";
import useTranslate from "../../../hooks/useTranslate.hook";
import shareService from "../../../services/share.service";
import { Share as ShareType } from "../../../types/share.type";
import toast from "../../../utils/toast.util";
import { byteToHumanSizeString } from "../../../utils/fileSize.util";
import mime from "mime-types";

export function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: { shareId: context.params!.shareId },
  };
}

const Share = ({ shareId }: { shareId: string }) => {
  const modals = useModals();
  const [share, setShare] = useState<ShareType>();
  const t = useTranslate();

  const getShareToken = async (password?: string) => {
    await shareService
      .getShareToken(shareId, password)
      .then(() => {
        modals.closeAll();
        getFiles();
      })
      .catch((e) => {
        const { error } = e.response.data;
        if (error == "share_max_views_exceeded") {
          showErrorModal(
            modals,
            t("share.error.visitor-limit-exceeded.title"),
            t("share.error.visitor-limit-exceeded.description"),
            "go-home",
          );
        } else if (error == "share_password_required") {
          showEnterPasswordModal(modals, getShareToken);
        } else {
          toast.axiosError(e);
        }
      });
  };

  const getFiles = async () => {
    shareService
      .get(shareId)
      .then((share) => {
        setShare(share);
      })
      .catch((e) => {
        const { error } = e.response.data;
        if (e.response.status == 404) {
          if (error == "share_removed") {
            showErrorModal(
              modals,
              t("share.error.removed.title"),
              e.response.data.message,
              "go-home",
            );
          } else {
            showErrorModal(
              modals,
              t("share.error.not-found.title"),
              t("share.error.not-found.description"),
              "go-home",
            );
          }
        } else if (e.response.status == 403 && error == "private_share") {
          showErrorModal(
            modals,
            t("share.error.access-denied.title"),
            t("share.error.access-denied.description"),
          );
        } else if (error == "share_password_required") {
          showEnterPasswordModal(modals, getShareToken);
        } else if (error == "share_token_required") {
          getShareToken();
        } else {
          showErrorModal(
            modals,
            t("common.error"),
            t("common.error.unknown"),
            "go-home",
          );
        }
      });
  };

  useEffect(() => {
    getFiles();
  }, []);

  const files = share?.files || [];
  const rootFiles = useMemo(
    () => files.filter((f: any) => !f.name.includes("/")),
    [files],
  );

  const gallerySections = useMemo(() => {
    const images = files.filter(
      (f: any) =>
        f.name.includes("/") &&
        (mime.lookup(f.name) || "").startsWith("image/"),
    );
    const zipMap = new Map<string, any[]>();
    for (const img of images) {
      const [zipName, ...rest] = img.name.split("/");
      const relative = rest.join("/");
      if (!zipMap.has(zipName)) zipMap.set(zipName, []);
      zipMap.get(zipName)!.push({ ...img, relative });
    }

    const result: { zip: any; sections: { path: string; files: any[] }[] }[] = [];
    const zips = rootFiles.filter((f: any) => f.name.endsWith(".zip"));

    for (const zip of zips) {
      const imgs = zipMap.get(zip.name);
      if (!imgs || imgs.length === 0) continue;

      type Node = { files: any[]; children: Record<string, Node> };
      const root: Node = { files: [], children: {} };

      for (const file of imgs) {
        const parts = file.relative.split("/");
        parts.pop();
        let node = root;
        for (const part of parts) {
          node.children[part] ||= { files: [], children: {} };
          node = node.children[part];
        }
        node.files.push(file);
      }

      const sections: { path: string; files: any[] }[] = [];
      const traverse = (node: Node, prefix: string) => {
        if (node.files.length) sections.push({ path: prefix, files: node.files });
        const entries = Object.entries(node.children).sort((a, b) =>
          a[0].localeCompare(b[0]),
        );
        for (let [name, child] of entries) {
          let path = name;
          let current = child;
          while (
            current.files.length === 0 &&
            Object.keys(current.children).length === 1
          ) {
            const [nextName, next] = Object.entries(current.children)[0];
            path += `/${nextName}`;
            current = next;
          }
          traverse(current, prefix ? `${prefix}/${path}` : path);
        }
      };

      traverse(root, "");
      result.push({ zip, sections });
    }

    return result;
  }, [files, rootFiles]);

  return (
    <>
      <Meta
        title={t("share.title", { shareId: share?.name || shareId })}
        description={t("share.description")}
      />

      <Group position="apart" mb="lg">
        <Box style={{ maxWidth: "70%" }}>
          <Title order={3}>{share?.name || shareId}</Title>
          <Text size="sm">{share?.description}</Text>
          {rootFiles.length > 0 && (
            <Text size="sm" color="dimmed" mt={5}>
              <FormattedMessage
                id="share.fileCount"
                values={{
                  count: rootFiles.length,
                  size: byteToHumanSizeString(
                    rootFiles.reduce(
                      (total: number, file: { size: string }) =>
                        total + parseInt(file.size),
                      0,
                    ),
                  ),
                }}
              />
            </Text>
          )}
        </Box>

        {rootFiles.length > 1 && <DownloadAllButton shareId={shareId} />}
      </Group>

      <FileList
        files={rootFiles}
        // Sorting is disabled for gallery shares to preserve image grouping
        setShare={() => {}}
        share={
          share ?? ({ id: shareId, files: rootFiles, hasPassword: false } as any)
        }
        isLoading={!share}
      />

      {gallerySections.map(({ zip, sections }) => (
        <Box key={zip.id} mt="xl">
          <Group position="apart" mb="sm">
            <Title order={3}>{zip.name}</Title>
            <Button
              variant="outline"
              onClick={() => shareService.downloadFile(shareId, zip.id)}
            >
              <FormattedMessage id="share.button.download" />
            </Button>
          </Group>

          {sections.map((section) => (
            <Box key={section.path} mb="lg">
              {section.path && (
                <Title order={4} mb="sm">
                  {section.path}
                </Title>
              )}

              <SimpleGrid
                cols={4}
                spacing="sm"
                breakpoints={[
                  { maxWidth: "lg", cols: 3 },
                  { maxWidth: "md", cols: 2 },
                  { maxWidth: "sm", cols: 1 },
                ]}
              >
                {section.files.map((file: any) => (
                  <a
                    key={file.id}
                    href={`/api/shares/${shareId}/files/${file.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={file.name}
                  >
                    <Image
                      src={`/api/shares/${shareId}/files/${file.id}`}
                      alt={file.name}
                      radius="sm"
                      width="100%"
                    />
                  </a>
                ))}
              </SimpleGrid>
            </Box>
          ))}
        </Box>
      ))}
    </>
  );
};

export default Share;
