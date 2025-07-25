"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import useCredits from "@/hooks/useCredits";
import { useBackendAPI } from "@/lib/autogpt-server-api/context";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useToast,
  useToastOnFail,
} from "@/components/molecules/Toast/use-toast";

import { RefundModal } from "./RefundModal";
import { CreditTransaction } from "@/lib/autogpt-server-api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CreditsPage() {
  const api = useBackendAPI();
  const {
    requestTopUp,
    autoTopUpConfig,
    updateAutoTopUpConfig,
    transactionHistory,
    fetchTransactionHistory,
    formatCredits,
    refundTopUp,
    refundRequests,
  } = useCredits({
    fetchInitialAutoTopUpConfig: true,
    fetchInitialRefundRequests: true,
    fetchInitialTransactionHistory: true,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const topupStatus = searchParams.get("topup") as "success" | "cancel" | null;
  const { toast } = useToast();
  const toastOnFail = useToastOnFail();

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [topUpTransactions, setTopUpTransactions] = useState<
    CreditTransaction[]
  >([]);
  const openRefundModal = () => {
    api.getTransactionHistory(null, 20, "TOP_UP").then((history) => {
      setTopUpTransactions(history.transactions);
      setIsRefundModalOpen(true);
    });
  };
  const refundCredits = (transaction_key: string, reason: string) =>
    refundTopUp(transaction_key, reason)
      .then((amount) => {
        if (amount > 0) {
          toast({
            title: "Refund approved! 🎉",
            description: `Your refund has been automatically processed. Based on your remaining balance, the amount of ${formatCredits(amount)} will be credited to your account.`,
          });
        } else {
          toast({
            title: "Refund Request Received",
            description:
              "We have received your refund request. A member of our team will review it and reach out via email shortly.",
          });
        }
      })
      .catch(toastOnFail("refund transaction"));

  useEffect(() => {
    if (api && topupStatus === "success") {
      api.fulfillCheckout().catch(toastOnFail("fulfill checkout"));
    }
  }, [api, topupStatus, toastOnFail]);

  const openBillingPortal = () =>
    api
      .getUserPaymentPortalLink()
      .then((portal) => {
        router.push(portal.url);
      })
      .catch(toastOnFail("open billing portal"));

  const submitTopUp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const amount =
      parseInt(new FormData(form).get("topUpAmount") as string) * 100;
    requestTopUp(amount).catch(toastOnFail("request top-up"));
  };

  const submitAutoTopUpConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount = parseInt(formData.get("topUpAmount") as string) * 100;
    const threshold = parseInt(formData.get("threshold") as string) * 100;
    updateAutoTopUpConfig(amount, threshold)
      .then(() => {
        toast({ title: "Auto top-up config updated! 🎉" });
      })
      .catch(toastOnFail("update auto top-up config"));
  };

  return (
    <div className="w-full px-4 sm:px-8 md:min-w-[800px]">
      <h1 className="mb-6 text-[28px] font-normal text-neutral-900 dark:text-neutral-100 sm:mb-8 sm:text-[35px]">
        Billing
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Top-up Form */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Top-up Credits</h3>

          <p className="mb-6 text-neutral-600 dark:text-neutral-400">
            {topupStatus === "success" && (
              <span className="text-green-500">
                Your payment was successful. Your credits will be updated
                shortly. Try refreshing the page in case it is not updated.
              </span>
            )}
            {topupStatus === "cancel" && (
              <span className="text-red-500">
                Payment failed. Your payment method has not been charged.
              </span>
            )}
          </p>

          <form onSubmit={submitTopUp} className="space-y-4">
            <div>
              <label
                htmlFor="topUpAmount"
                className="mb-1 block text-neutral-700"
              >
                Top-up amount (USD), minimum $5:
              </label>
              <input
                type="number"
                id="topUpAmount"
                name="topUpAmount"
                placeholder="Enter top-up amount"
                min="5"
                step="1"
                defaultValue={5}
                className="w-full rounded-md border border-slate-200 px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Top-up
            </Button>
          </form>

          {/* Auto Top-up Form */}
          <form onSubmit={submitAutoTopUpConfig} className="my-6 space-y-4">
            <h3 className="text-lg font-medium">Automatic Refill Settings</h3>

            <div>
              <label
                htmlFor="threshold"
                className="mb-1 block text-neutral-700"
              >
                When my balance goes below this amount:
              </label>
              <input
                type="number"
                id="threshold"
                name="threshold"
                defaultValue={
                  autoTopUpConfig?.threshold
                    ? autoTopUpConfig.threshold / 100
                    : ""
                }
                placeholder="Refill threshold, minimum $5"
                min="5"
                step="1"
                className="w-full rounded-md border border-slate-200 px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
                required
              />
            </div>

            <div>
              <label
                htmlFor="autoTopUpAmount"
                className="mb-1 block text-neutral-700"
              >
                Automatically refill my balance with this amount:
              </label>
              <input
                type="number"
                id="autoTopUpAmount"
                name="topUpAmount"
                defaultValue={
                  autoTopUpConfig?.amount ? autoTopUpConfig.amount / 100 : ""
                }
                placeholder="Refill amount, minimum $5"
                min="5"
                step="1"
                className="w-full rounded-md border border-slate-200 px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
                required
              />
            </div>

            <p className="text-sm">
              <b>Note:</b> For your safety, we will top up your balance{" "}
              <b>at most once</b> per agent execution to prevent unintended
              excessive charges. Therefore, ensure that the automatic top-up
              amount is sufficient for your agent&apos;s operation.
            </p>

            {autoTopUpConfig?.amount ? (
              <>
                <Button type="submit" className="w-full">
                  Save Changes
                </Button>
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() =>
                    updateAutoTopUpConfig(0, 0).then(() => {
                      toast({ title: "Auto top-up config disabled! 🎉" });
                    })
                  }
                >
                  Disable Auto-Refill
                </Button>
              </>
            ) : (
              <Button type="submit" className="w-full">
                Enable Auto-Refill
              </Button>
            )}
          </form>
        </div>

        <div className="my-6 space-y-4">
          {/* Payment Portal */}

          <h3 className="text-lg font-medium">Manage Your Payment Methods</h3>
          <p className="text-neutral-600">
            You can manage your cards and see your payment history in the
            billing portal.
          </p>
          <Button
            type="submit"
            className="w-full"
            onClick={() => openBillingPortal()}
          >
            Open Portal
          </Button>

          {/* Transaction History */}
          <h3 className="text-lg font-medium">Transaction History</h3>
          <p className="text-neutral-600">
            Running balance might not be ordered accurately when concurrent
            executions are happening.
          </p>
          {transactionHistory.transactions.length === 0 && (
            <p className="text-neutral-600">No transactions found.</p>
          )}
          <Table
            className={
              transactionHistory.transactions.length === 0 ? "hidden" : ""
            }
          >
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionHistory.transactions.map((transaction, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {new Date(transaction.transaction_time).toLocaleString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      },
                    )}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  {/* Make it green if it's positive, red if it's negative */}
                  <TableCell
                    className={
                      transaction.amount > 0 ? "text-green-500" : "text-red-500"
                    }
                  >
                    <b>{formatCredits(transaction.amount)}</b>
                  </TableCell>
                  <TableCell>
                    {formatCredits(transaction.running_balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {transactionHistory.next_transaction_time && (
            <Button
              type="submit"
              className="w-full"
              onClick={() => fetchTransactionHistory()}
            >
              Load More
            </Button>
          )}

          {refundRequests.length > 0 && (
            <>
              <h3 className="text-lg font-medium">Your Refund Requests</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundRequests.map((request, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {new Date(request.updated_at).toLocaleString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                          },
                        )}
                      </TableCell>
                      <TableCell>{formatCredits(request.amount)}</TableCell>
                      <TableCell>{request.status}</TableCell>
                      <TableCell>{request.result}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          <Button
            variant="destructive"
            onClick={() => openRefundModal()}
            className="w-full"
          >
            Request Refund
          </Button>
          <RefundModal
            isOpen={isRefundModalOpen}
            onClose={() => setIsRefundModalOpen(false)}
            transactions={topUpTransactions}
            formatCredits={formatCredits}
            refundCredits={refundCredits}
          />
        </div>
      </div>
    </div>
  );
}
