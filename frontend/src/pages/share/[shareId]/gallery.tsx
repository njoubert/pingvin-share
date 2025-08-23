import {
  Box,
  Group,
  SimpleGrid,
  Image,
  Text,
  Title,
  Button,
} from "@mantine/core";
import { useModals } from "@mantine/modals";
import { GetServerSidePropsContext } from "next";
import { useEffect, useMemo, useState } from "react";
import Meta from "../../../components/Meta";
import showEnterPasswordModal from "../../../components/share/showEnterPasswordModal";
import showErrorModal from "../../../components/share/showErrorModal";
import useTranslate from "../../../hooks/useTranslate.hook";
import shareService from "../../../services/share.service";
import { Share as ShareType } from "../../../types/share.type";
import toast from "../../../utils/toast.util";
import { FormattedMessage } from "react-intl";
import mime from "mime-types";

export function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: { shareId: context.params!.shareId },
  };
}

const Gallery = ({ shareId }: { shareId: string }) => {
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
      .then((s) => {
        setShare(s);
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

  const images = share?.files?.filter((file: any) =>
    (mime.lookup(file.name) || "").startsWith("image/")
  );
  const zipFile = share?.files?.find((f: any) => f.name.endsWith(".zip"));

  const sections = useMemo(() => {
    if (!images) return [];

    type Node = { files: any[]; children: Record<string, Node> };
    const root: Node = { files: [], children: {} };

    for (const file of images) {
      const parts = file.name.split("/");
      parts.pop();
      let node = root;
      for (const part of parts) {
        node.children[part] ||= { files: [], children: {} };
        node = node.children[part];
      }
      node.files.push(file);
    }

    const result: { path: string; files: any[] }[] = [];
    const traverse = (node: Node, prefix: string) => {
      if (node.files.length) {
        result.push({ path: prefix, files: node.files });
      }

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
    return result;
  }, [images]);

  return (
    <>
      <Meta
        title={t("share.title", { shareId: share?.name || shareId })}
        description={t("share.description")}
      />

      <Group position="apart" mb="lg">
        <Box style={{ maxWidth: "70%" }}>
          <Title order={3}>{share?.name || share?.id}</Title>
          <Text size="sm">{share?.description}</Text>
        </Box>

        {zipFile && (
          <Button
            variant="outline"
            onClick={() => shareService.downloadFile(shareId, zipFile.id)}
          >
            <FormattedMessage id="share.button.download-all" />
          </Button>
        )}
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
    </>
  );
};

export default Gallery;
