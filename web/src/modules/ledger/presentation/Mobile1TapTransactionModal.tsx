"use client";

import React from "react";
import {
  AccountDto,
  RegisterTransactionRequest,
} from "@/modules/ledger/domain/ledger.types";
import { RegisterTransactionModal } from "./RegisterTransactionModal";

interface Mobile1TapTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountDto[];
  p2pRate: number;
  onRegister: (req: RegisterTransactionRequest) => Promise<void>;
  onOpenCreateAccount?: () => void;
}

export function Mobile1TapTransactionModal({
  isOpen,
  onClose,
  accounts,
  p2pRate,
  onRegister,
  onOpenCreateAccount,
}: Mobile1TapTransactionModalProps) {
  return (
    <RegisterTransactionModal
      isOpen={isOpen}
      onClose={onClose}
      accounts={accounts}
      defaultAccountId={accounts[0]?.id || ""}
      p2pRate={p2pRate}
      onSubmit={onRegister}
      onOpenCreateAccount={onOpenCreateAccount}
    />
  );
}
